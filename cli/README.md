# MarkDocs CLI

Command-line interface and MCP server for [MarkDocs](https://markdocs.sh).

## Install

```bash
curl -fsSL https://markdocs.sh/install.sh | bash
```

Or build from source:

```bash
cd cli && npm install && npm run bundle
```

## Setup

```bash
# Interactive login + API key creation
markdocs login --url http://localhost:3001 --handle yourhandle
markdocs setup

# Or set credentials directly
export MARKDOCS_API_KEY=your-api-key
export MARKDOCS_URL=http://localhost:3001
```

## Commands

### Documents

```bash
markdocs list                          # List all documents
markdocs create "My Document"          # Create a document
markdocs create "From File" --file draft.md
markdocs view <id>                     # View metadata
markdocs open <id>                     # Open in browser
markdocs delete <id>
```

### Content

```bash
markdocs content <id>                  # Print markdown to stdout
markdocs content <id> > doc.md         # Pipe to file
markdocs edit <id> --content "# New"   # Full replace
markdocs edit <id> --file updated.md
```

### Text-Based Editing

```bash
markdocs replace <id> --find "old text" --replace "new text"
```

### Comments

```bash
markdocs comment list <id>             # Flat list
markdocs comment threads <id>          # Threaded view
markdocs comment add <id> --content "Fix this" --on "anchor text"
markdocs comment add <id> --content "Fix this" --from 10 --to 20
markdocs comment reply <comment-id> --content "Done." --resolve
markdocs comment resolve <comment-id>
markdocs comment unresolve <comment-id>
markdocs comment delete <comment-id>
```

### Suggestions

```bash
markdocs suggest list <id>
markdocs suggest add <id> --find "old" --replace "new"
markdocs suggest accept <suggestion-id>
markdocs suggest reject <suggestion-id>
```

### Sharing

```bash
markdocs users                         # List workspace users
markdocs share list <id>               # List collaborators
markdocs share add <id> @john          # Share as editor
markdocs share add <id> @jane --role viewer
markdocs share remove <id> <collab-id>
```

### History & Auth

```bash
markdocs history <id>
markdocs whoami
markdocs logout
```

## MCP Server

The CLI includes an MCP server with 23 tools. Your MCP client spawns it automatically:

```json
{
  "mcpServers": {
    "markdocs": {
      "command": "markdocs",
      "args": ["mcp"]
    }
  }
}
```

See the [MCP docs](https://markdocs.sh/docs/mcp) for the full tool list.

## License

MIT
