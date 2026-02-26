use anyhow::Result;
use rmcp::{model::CallToolRequestParam, service::ServiceExt, transport::TokioChildProcess};
use std::process::Stdio;
use tokio::process::Command;

fn desktop_binary_path() -> String {
    std::env::var("CARGO_BIN_EXE_terraphim-ai-desktop")
        .unwrap_or_else(|_| "target/debug/terraphim-ai-desktop".to_string())
}

#[tokio::test]
async fn test_desktop_mcp_server_basic_search() -> Result<()> {
    let mut cmd = Command::new(desktop_binary_path());
    cmd.arg("mcp-server")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let transport = TokioChildProcess::new(cmd)?;
    let service = ().serve(transport).await?;

    let tools = service.list_tools(Default::default()).await?;
    assert!(!tools.tools.is_empty(), "No tools exposed by desktop MCP server");

    let search_result = service
        .call_tool(CallToolRequestParam {
            name: "search".into(),
            arguments: serde_json::json!({
                "query": "terraphim",
                "limit": 3
            })
            .as_object()
            .cloned(),
        })
        .await?;

    assert!(
        !search_result.is_error.unwrap_or(false),
        "Search reported error"
    );

    service.cancel().await?;
    Ok(())
}
