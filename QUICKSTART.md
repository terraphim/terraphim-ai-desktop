# Terraphim AI Desktop - Quickstart Guide

Terraphim AI Desktop is a privacy-first AI assistant that runs locally, providing semantic search across your personal knowledge bases with real-time autocomplete and context-aware conversations.

## Table of Contents

- [User Quickstart](#user-quickstart)
- [Developer Quickstart](#developer-quickstart)
- [Features Overview](#features-overview)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## User Quickstart

### Prerequisites

- **macOS**, **Linux**, or **Windows** (with WSL2)
- **Node.js 18+** and **Yarn**
- **Rust 1.70+** (for building from source)
- **4GB+ RAM** recommended
- **2GB+ disk space**

### Installation

#### Option 1: Download Binary (Recommended)

```bash
# Download the latest release for your platform
curl -L https://github.com/terraphim/terraphim-ai/releases/latest/download/terraphim-desktop-macos.tar.gz -o terraphim-desktop.tar.gz

# Extract and install
tar -xzf terraphim-desktop.tar.gz
sudo cp terraphim-desktop /usr/local/bin/
```

#### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/terraphim/terraphim-ai.git
cd terraphim-ai/desktop

# Install dependencies
yarn install

# Build the desktop application
yarn tauri:build

# Or run in development mode
yarn tauri:dev
```

### Getting Started

1. **Launch the Application**
   ```bash
   # If installed via binary
   terraphim-desktop

   # Or run from source
   cd desktop
   yarn tauri:dev
   ```

2. **First Run Setup**
   - The app will automatically create your document directory
   - Default document location: `~/Documents/Terraphim`
   - Three roles are pre-configured:
     - **Default**: General-purpose search
     - **Terraphim Engineer**: Development-focused search
     - **Rust Engineer**: Rust programming specialization

3. **Basic Usage**

   **Searching Your Knowledge Base**
   ```
   1. Click the "Search" tab
   2. Type your query (e.g., "rust async programming")
   3. Get relevant documents from your knowledge base
   ```

   **Building Context**
   - Click the menu icon on any search result
   - Select "Add to Context" to add documents to your conversation context
   - Go to the "Chat" tab to see your context and start conversations
   - Use "Chat with Document" to jump directly to chat with a document

   **Having Conversations**
   ```
   1. Switch to the "Chat" tab
   2. Your context appears at the top
   3. Type your question
   4. AI responds based on your context documents
   ```

   **Switching Roles**
   - Use the role dropdown in the top-right corner
   - Each role has different search preferences and knowledge graphs
   - Themes change automatically based on the selected role

   **Exploring the Knowledge Graph**
   ```
   1. Click the "Graph" tab
   2. View the interactive knowledge graph visualization
   3. Click nodes to explore connections
   4. Drag nodes to reposition
   ```

### Adding Your Documents

#### Supported Formats:
- **Markdown** (.md)
- **Text files** (.txt)
- **Code files** (.rs, .js, .py, etc.)

#### Adding Documents:
1. **Automatic**: Place files in your Terraphim documents folder
2. **Configure haystacks**: Use the Configuration Wizard to add more folders
3. **Atomic Server**: Save documents directly to Atomic Server (if configured)

### Search Tips

#### Using Knowledge Graph Terms:
- Type `@` in the search box to see knowledge graph suggestions
- Select terms to refine your search
- Use the AND/OR toggle for complex queries

#### Result Actions:
Each search result has an action menu with:
- **Download to Markdown**: Save the document locally
- **Add to Context**: Include in AI conversation context
- **Chat with Document**: Jump to chat with this document
- **Save to Atomic Server**: Save to configured Atomic Server
- **Open URL**: Open the original source

#### Autocomplete in Editor:
- Type `@` in the Novel editor to trigger Terraphim autocomplete
- Navigate with arrow keys
- Press Tab or Enter to select
- Press Escape to cancel

---

## Developer Quickstart

### Development Environment Setup

#### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 18+
# https://nodejs.org/

# Install Yarn
npm install -g yarn

# Install Tauri CLI
cargo install tauri-cli
```

#### Project Structure
```
terraphim-ai/desktop/
├── src/
│   ├── lib/
│   │   ├── Chat/              # Chat components
│   │   ├── Search/            # Search functionality
│   │   ├── Editor/            # Novel editor with autocomplete
│   │   ├── ConfigWizard.svelte
│   │   └── ...
│   ├── App.svelte             # Main app component
│   └── main.ts                # Entry point
├── src-tauri/                 # Rust Tauri backend
├── tests/
│   ├── e2e/                   # Playwright E2E tests
│   └── unit/                  # Vitest unit tests
└── package.json
```

### Building and Running

#### Development Build
```bash
cd desktop

# Install dependencies
yarn install

# Run in development mode (web only)
yarn dev

# Run Tauri development mode (full desktop app)
yarn tauri:dev

# Build for production
yarn tauri:build
```

#### Development Watch Mode
```bash
# Auto-rebuild on file changes (Vite handles this automatically)
yarn dev
```

### Code Quality

#### Linting and Formatting
The project uses Biome for code quality:
```bash
# Check code
yarn check

# CI-friendly check
yarn check:ci
```

### Testing

#### Running Tests
```bash
# Unit tests
yarn test

# Unit tests in CI mode
yarn test:ci

# E2E tests
yarn e2e

# E2E tests in headed mode (visible browser)
yarn e2e:headed

# Atomic Server integration tests
yarn test:atomic

# Run all tests
yarn test:all
```

#### Writing Tests
```typescript
// E2E test example
import { test, expect } from '@playwright/test';

test('search functionality', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search-input"]', 'rust');
  await page.press('[data-testid="search-input"]', 'Enter');
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
});
```

### Contributing

#### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Make** your changes
4. **Run** tests: `yarn test:all`
5. **Run** checks: `yarn check`
6. **Commit** with conventional commits
7. **Push** and create a pull request

---

## Features Overview

### Search Capabilities
- **Full-text Search**: Search across multiple haystacks (data sources)
- **Knowledge Graph Integration**: Term autocomplete with semantic awareness
- **Logical Operators**: AND/OR for complex queries
- **AI Summarization**: Generate summaries of search results
- **Result Actions**: Download, add to context, chat, save to Atomic Server

### Chat Features
- **Persistent Conversations**: Conversations saved to backend with IDs
- **Context Management**: Add/remove documents from conversation context
- **Global Context**: Shared context across conversations
- **Markdown Rendering**: Rich text support in messages
- **Debug Mode**: Request/response inspection for development

### Knowledge Graph Visualization
- **Interactive Graph**: D3.js-based force-directed graph
- **Node Interactions**: Click to view, right-click to edit, drag to reposition
- **Role-specific Graphs**: Different graphs per role
- **Fullscreen Support**: Responsive design

### Configuration System
- **Role Management**: Create/edit/delete roles with different settings
- **Haystack Configuration**: Add multiple data sources (Ripgrep, AtomicServer, QueryRs, MCP)
- **LLM Configuration**: Support for Ollama and OpenRouter
- **Theme Selection**: Multiple Bulmaswatch themes per role
- **JSON Editor**: Direct JSON configuration editing

### Editor Features
- **Rich Text Editing**: TipTap-based editor with StarterKit
- **Markdown Support**: Import/export markdown
- **Terraphim Autocomplete**: `@` trigger for KG-aware autocomplete
- **Slash Commands**: `/` trigger for editor commands
- **MCP Integration**: Connects to Terraphim MCP server

---

## Configuration

### Role Configuration

Each role has its own configuration:

#### Default Role
```json
{
  "name": "Default",
  "relevance_function": "TitleScorer",
  "theme": "spacelab",
  "haystacks": [
    {
      "location": "~/Documents/Terraphim",
      "service": "Ripgrep",
      "read_only": false
    }
  ]
}
```

#### Terraphim Engineer Role
```json
{
  "name": "Terraphim Engineer",
  "relevance_function": "TerraphimGraph",
  "theme": "lumen",
  "haystacks": [
    {
      "location": "~/Projects",
      "service": "Ripgrep",
      "read_only": false
    }
  ],
  "kg": {
    "knowledge_graph_local": {
      "input_type": "Markdown",
      "path": "~/Documents/kg"
    }
  }
}
```

### Haystack Types

| Service | Description | Use Case |
|---------|-------------|----------|
| **Ripgrep** | Local file system search | Personal documents |
| **Atomic Server** | Atomic Data protocol | Collaborative knowledge |
| **QueryRs** | Rust documentation API | Rust development |
| **MCP** | Model Context Protocol | AI tool integration |

### LLM Configuration

#### Ollama (Local Models)
```json
{
  "llm_provider": "ollama",
  "ollama_base_url": "http://127.0.0.1:11434",
  "ollama_model": "llama3.2:3b"
}
```

#### OpenRouter (Cloud Models)
```json
{
  "llm_provider": "openrouter",
  "openrouter_api_key": "your-api-key",
  "llm_model": "anthropic/claude-3.5-sonnet"
}
```

### Settings File Location

- **macOS**: `~/Library/Application Support/Terraphim/settings.toml`
- **Linux**: `~/.config/terraphim/settings.toml`
- **Windows**: `%APPDATA%/Terraphim/settings.toml`

---

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Reinstall dependencies
cd desktop
yarn clean
yarn install

# Check Tauri CLI
cargo tauri --version
```

#### Search Returns No Results
1. **Check document indexing**:
   - Ensure documents are in configured haystack paths
   - Verify file permissions

2. **Check configuration**:
   - Open Configuration Wizard
   - Verify haystack paths are correct
   - Ensure role has at least one haystack

3. **Check backend connection**:
   - Verify terraphim-server is running
   - Check server URL in config

#### High Memory Usage
1. **Reduce index size**: Limit document folders
2. **Adjust settings**: Lower cache size in configuration
3. **Restart app**: Clear memory caches

#### Slow Search Performance
1. **Check disk space**: Ensure adequate space for index files
2. **Update relevance function**: Try different ranking algorithms
3. **Limit search scope**: Use specific haystacks

### Debug Mode

Enable debug logging:
```bash
# Set debug log level
export RUST_LOG=debug
yarn tauri:dev
```

Browser console (Developer Tools):
- Press `F12` or `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Linux/Windows)
- Check Console tab for JavaScript errors
- Check Network tab for API requests

### Getting Help

- **Documentation**: https://docs.terraphim.ai
- **Issues**: https://github.com/terraphim/terraphim-ai/issues
- **Discussions**: https://github.com/terraphim/terraphim-ai/discussions

### Performance Tips

1. **SSD Storage**: Use SSD for better index performance
2. **RAM**: 8GB+ recommended for large knowledge bases
3. **Document Organization**: Keep related files together
4. **Regular Updates**: Keep app updated for performance improvements

---

## Additional Resources

- **Architecture Guide**: See `docs/` directory
- **API Documentation**: https://docs.terraphim.ai
- **Contributing Guide**: CONTRIBUTING.md
- **Examples**: `examples/` directory

---

## Ready to Go

You are all set up with Terraphim AI Desktop. Here are some next steps:

1. **Add your documents** to start building your knowledge base
2. **Try different roles** to see specialized search results
3. **Start a conversation** with context from your documents
4. **Explore the knowledge graph** to understand concept relationships

Happy searching!

*Last updated: March 2026*
