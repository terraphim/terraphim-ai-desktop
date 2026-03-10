use anyhow::Result;
use std::process::Stdio;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

fn desktop_binary_path() -> String {
    // Get the project root from CARGO_MANIFEST_DIR
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());

    // Build the path to the binary
    let binary_path = std::path::Path::new(&manifest_dir)
        .join("..")
        .join("..")
        .join("target")
        .join("debug")
        .join("terraphim-ai-desktop");

    let binary_path_str = binary_path.to_string_lossy().to_string();
    println!("Looking for binary at: {}", binary_path_str);

    // Check if it exists
    if binary_path.exists() {
        return binary_path_str;
    }

    // Try alternative paths
    let alternatives = vec![
        // From manifest dir (if we're in desktop/src-tauri)
        std::path::Path::new(&manifest_dir)
            .join("..")
            .join("..")
            .join("..")
            .join("target")
            .join("debug")
            .join("terraphim-ai-desktop")
            .to_string_lossy()
            .to_string(),
        // Direct from manifest dir
        std::path::Path::new(&manifest_dir)
            .join("target")
            .join("debug")
            .join("terraphim-ai-desktop")
            .to_string_lossy()
            .to_string(),
        // Environment variable set by cargo during tests
        std::env::var("CARGO_BIN_EXE_terraphim-ai-desktop").unwrap_or_default(),
        // Relative paths
        "target/debug/terraphim-ai-desktop".to_string(),
        "./target/debug/terraphim-ai-desktop".to_string(),
        "../target/debug/terraphim-ai-desktop".to_string(),
    ];

    for path in alternatives {
        println!("Trying alternative path: {}", path);
        if std::path::Path::new(&path).exists() {
            println!("Found binary at: {}", path);
            return path;
        }
    }

    // Return the first path anyway, will fail with descriptive error
    binary_path_str
}

/// Test that the desktop binary can start in MCP server mode and respond to JSON-RPC requests
#[tokio::test]
async fn test_desktop_mcp_server_starts_and_responds() -> Result<()> {
    let binary_path = desktop_binary_path();

    assert!(
        std::path::Path::new(&binary_path).exists(),
        "Desktop binary not found at: {}. Please run `cargo build` first.",
        binary_path
    );

    // Start the desktop binary in MCP server mode
    let mut cmd = Command::new(&binary_path);
    cmd.arg("mcp-server")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn()?;

    let stdin = child.stdin.take().expect("Failed to take stdin");
    let stdout = child.stdout.take().expect("Failed to take stdout");
    let mut stderr = child.stderr.take().expect("Failed to take stderr");

    // Spawn a task to read stderr
    tokio::spawn(async move {
        let reader = BufReader::new(&mut stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            eprintln!("[MCP Server stderr] {}", line);
        }
    });

    let mut stdout_reader = BufReader::new(stdout).lines();

    // Send MCP initialize request
    let init_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    });

    let request_line = format!("{}\n", serde_json::to_string(&init_request)?);
    let mut stdin = stdin;
    stdin.write_all(request_line.as_bytes()).await?;
    stdin.flush().await?;

    // Read the response with a timeout
    let response_line = timeout(Duration::from_secs(10), stdout_reader.next_line())
        .await
        .map_err(|_| anyhow::anyhow!("Timeout waiting for MCP server response"))?
        .map_err(|e| anyhow::anyhow!("Failed to read response: {}", e))?;

    let response_line = response_line.ok_or_else(|| anyhow::anyhow!("No response from server"))?;

    // Parse the response
    let response: serde_json::Value = serde_json::from_str(&response_line)?;

    // Verify it's a valid JSON-RPC response
    assert_eq!(response["jsonrpc"], "2.0", "Invalid JSON-RPC version");
    assert_eq!(response["id"], 1, "Response ID mismatch");
    assert!(
        response.get("result").is_some() || response.get("error").is_some(),
        "Response must have either result or error"
    );

    // If there's a result, verify it contains expected fields
    if let Some(result) = response.get("result") {
        assert!(
            result.get("protocolVersion").is_some(),
            "Missing protocolVersion in result"
        );
        assert!(
            result.get("serverInfo").is_some(),
            "Missing serverInfo in result"
        );
        assert!(
            result.get("capabilities").is_some(),
            "Missing capabilities in result"
        );

        let server_info = &result["serverInfo"];
        assert_eq!(
            server_info["name"], "terraphim-mcp",
            "Unexpected server name"
        );
    }

    // Clean up
    let _ = child.kill().await;

    Ok(())
}

/// Test that the MCP server exposes the expected tools
#[tokio::test]
async fn test_desktop_mcp_server_exposes_tools() -> Result<()> {
    let binary_path = desktop_binary_path();

    assert!(
        std::path::Path::new(&binary_path).exists(),
        "Desktop binary not found at: {}. Please run `cargo build` first.",
        binary_path
    );

    let mut cmd = Command::new(&binary_path);
    cmd.arg("mcp-server")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn()?;

    let stdin = child.stdin.take().expect("Failed to take stdin");
    let stdout = child.stdout.take().expect("Failed to take stdout");
    let mut stderr = child.stderr.take().expect("Failed to take stderr");

    tokio::spawn(async move {
        let reader = BufReader::new(&mut stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            eprintln!("[MCP Server stderr] {}", line);
        }
    });

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stdin = stdin;

    // Helper function to send request and get response
    async fn send_request(
        stdin: &mut tokio::process::ChildStdin,
        stdout_reader: &mut tokio::io::Lines<BufReader<tokio::process::ChildStdout>>,
        request: serde_json::Value,
    ) -> Result<serde_json::Value> {
        let request_line = format!("{}\n", serde_json::to_string(&request)?);
        stdin.write_all(request_line.as_bytes()).await?;
        stdin.flush().await?;

        let response_line = timeout(Duration::from_secs(10), stdout_reader.next_line())
            .await
            .map_err(|_| anyhow::anyhow!("Timeout waiting for response"))?
            .map_err(|e| anyhow::anyhow!("Failed to read: {}", e))?
            .ok_or_else(|| anyhow::anyhow!("No response"))?;

        Ok(serde_json::from_str(&response_line)?)
    }

    // Initialize
    let init_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    });
    let _init_response = send_request(&mut stdin, &mut stdout_reader, init_request).await?;

    // Send initialized notification
    let initialized_notification = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    let notif_line = format!("{}\n", serde_json::to_string(&initialized_notification)?);
    stdin.write_all(notif_line.as_bytes()).await?;
    stdin.flush().await?;

    // Request tools/list
    let tools_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    });
    let tools_response = send_request(&mut stdin, &mut stdout_reader, tools_request).await?;

    // Verify tools response
    assert!(
        tools_response.get("result").is_some(),
        "Missing result in tools response"
    );
    let result = &tools_response["result"];
    assert!(
        result.get("tools").is_some(),
        "Missing tools array in response"
    );
    let tools = result["tools"]
        .as_array()
        .expect("tools should be an array");
    assert!(!tools.is_empty(), "No tools exposed by MCP server");

    // Check for expected tools
    let tool_names: Vec<String> = tools
        .iter()
        .filter_map(|t| t["name"].as_str().map(String::from))
        .collect();

    println!("Available tools: {:?}", tool_names);

    // Verify at least core tools are present
    let expected_tools = ["search", "autocomplete_terms"];
    for expected in &expected_tools {
        assert!(
            tool_names.iter().any(|name| name == *expected),
            "Missing expected tool: {}. Available tools: {:?}",
            expected,
            tool_names
        );
    }

    // Clean up
    let _ = child.kill().await;

    Ok(())
}

/// Test that the MCP server can perform a search
#[tokio::test]
async fn test_desktop_mcp_server_search_tool() -> Result<()> {
    let binary_path = desktop_binary_path();

    assert!(
        std::path::Path::new(&binary_path).exists(),
        "Desktop binary not found at: {}. Please run `cargo build` first.",
        binary_path
    );

    let mut cmd = Command::new(&binary_path);
    cmd.arg("mcp-server")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn()?;

    let stdin = child.stdin.take().expect("Failed to take stdin");
    let stdout = child.stdout.take().expect("Failed to take stdout");
    let mut stderr = child.stderr.take().expect("Failed to take stderr");

    tokio::spawn(async move {
        let reader = BufReader::new(&mut stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            eprintln!("[MCP Server stderr] {}", line);
        }
    });

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stdin = stdin;

    // Helper function to send request and get response
    async fn send_request(
        stdin: &mut tokio::process::ChildStdin,
        stdout_reader: &mut tokio::io::Lines<BufReader<tokio::process::ChildStdout>>,
        request: serde_json::Value,
    ) -> Result<serde_json::Value> {
        let request_line = format!("{}\n", serde_json::to_string(&request)?);
        stdin.write_all(request_line.as_bytes()).await?;
        stdin.flush().await?;

        let response_line = timeout(Duration::from_secs(15), stdout_reader.next_line())
            .await
            .map_err(|_| anyhow::anyhow!("Timeout waiting for response"))?
            .map_err(|e| anyhow::anyhow!("Failed to read: {}", e))?
            .ok_or_else(|| anyhow::anyhow!("No response"))?;

        Ok(serde_json::from_str(&response_line)?)
    }

    // Initialize
    let init_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    });
    let _init_response = send_request(&mut stdin, &mut stdout_reader, init_request).await?;

    // Send initialized notification
    let initialized_notification = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    let notif_line = format!("{}\n", serde_json::to_string(&initialized_notification)?);
    stdin.write_all(notif_line.as_bytes()).await?;
    stdin.flush().await?;

    // Call search tool
    let search_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "search",
            "arguments": {
                "query": "terraphim",
                "limit": 3
            }
        }
    });
    let search_response = send_request(&mut stdin, &mut stdout_reader, search_request).await?;

    println!(
        "Search response: {}",
        serde_json::to_string_pretty(&search_response)?
    );

    // Verify response structure
    assert!(
        search_response.get("result").is_some() || search_response.get("error").is_some(),
        "Search response must have result or error"
    );

    // Clean up
    let _ = child.kill().await;

    Ok(())
}
