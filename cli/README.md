# MarkDocs CLI

Command-line interface and MCP server for [MarkDocs](https://markdocs.sh) — collaborative markdown editing.

## Install

```bash
curl -fsSL https://markdocs.sh/install.sh | bash
```

## Setup

```bash
export MARKDOCS_API_KEY=your-api-key
export MARKDOCS_URL=https://markdocs.sh  # or your self-hosted instance
```

## Usage

```bash
# Documents
markdocs list
markdocs create "My Document"
markdocs view <id>
markdocs open <id>
markdocs delete <id>

# Comments
markdocs comment list <doc-id>
markdocs comment add <doc-id> --content "Fix this" --from 10 --to 20
markdocs comment resolve <comment-id>
markdocs comment delete <comment-id>

# Suggestions
markdocs suggest list <doc-id>
markdocs suggest add <doc-id> --original "old" --suggested "new" --from 0 --to 3
markdocs suggest accept <suggestion-id>
markdocs suggest reject <suggestion-id>

# History
markdocs history <doc-id>
```

## MCP Server

Connect AI agents (Claude, GPT, etc.) to MarkDocs via [Model Context Protocol](https://modelcontextprotocol.io).

```bash
# Run directly
markdocs-mcp

# Or via CLI
markdocs mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "markdocs": {
      "command": "markdocs-mcp",
      "env": {
        "MARKDOCS_API_KEY": "your-key",
        "MARKDOCS_URL": "https://markdocs.sh"
      }
    }
  }
}
```

### Claude Code

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "markdocs": {
      "command": "markdocs-mcp",
      "env": {
        "MARKDOCS_API_KEY": "your-key",
        "MARKDOCS_URL": "https://markdocs.sh"
      }
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `list_documents` | List all documents |
| `create_document` | Create a new document |
| `get_document` | Get document by ID |
| `delete_document` | Delete a document |
| `list_comments` | List comments on a document |
| `add_comment` | Add an inline comment |
| `resolve_comment` | Resolve a comment |
| `delete_comment` | Delete a comment |
| `list_suggestions` | List suggestions |
| `add_suggestion` | Propose a text change |
| `accept_suggestion` | Accept a suggestion |
| `reject_suggestion` | Reject a suggestion |
| `get_history` | Get edit history |
| `get_document_content` | Get markdown content of a document |
| `update_document_content` | Update markdown content of a document |
| `list_users` | List all users in the workspace |
| `list_collaborators` | List collaborators on a document |
| `share_document` | Share a document with a user |
| `unshare_document` | Remove a collaborator |

## Docs

Full documentation at [markdocs.sh/docs](https://markdocs.sh/docs)

## License

MIT
