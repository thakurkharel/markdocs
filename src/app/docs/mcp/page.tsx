import Link from "next/link";

export default function MCPDocsPage() {
  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>MCP Server Setup</h1>
      <p className="lead">
        Connect AI agents like Claude to MarkDocs using the
        Model Context Protocol (MCP). Your AI can create documents, leave comments,
        make suggestions, share documents, and review edit history.
      </p>

      <h2>What is MCP?</h2>
      <p>
        The <strong>Model Context Protocol</strong> is an open standard for connecting
        AI models to external tools and data sources. MarkDocs implements an MCP server
        that exposes 19 tools and 2 resources, allowing any MCP-compatible AI agent to
        interact with your documents.
      </p>

      <h2>Setup Options</h2>
      <p>Choose the method that fits your workflow:</p>

      <h3>Option A: Docker MCP Gateway (recommended)</h3>
      <p>
        The MCP server ships as a Docker image. Build it once, then point any MCP client at it.
      </p>
      <pre><code>{`# Build the MCP image from the repo root
docker build -f Dockerfile.mcp -t markdocs-mcp .`}</code></pre>

      <h4>Docker MCP Toolkit</h4>
      <p>
        If you use <strong>Docker Desktop 4.62+</strong> with the MCP Toolkit enabled,
        add MarkDocs to a profile:
      </p>
      <pre><code>{`# Add the markdocs-mcp image to a Docker MCP Toolkit profile
docker mcp gateway run --profile my_profile`}</code></pre>
      <p>
        Or configure any client that supports Docker MCP Toolkit:
      </p>
      <pre><code>{`{
  "servers": {
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["mcp", "gateway", "run", "--profile", "my_profile"],
      "type": "stdio"
    }
  }
}`}</code></pre>

      <h4>Direct Docker run</h4>
      <p>
        For clients that accept a custom command, point them at the Docker image directly:
      </p>
      <pre><code>{`{
  "mcpServers": {
    "markdocs": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "MARKDOCS_URL",
        "-e", "MARKDOCS_API_KEY",
        "markdocs-mcp"
      ],
      "env": {
        "MARKDOCS_API_KEY": "your-api-key",
        "MARKDOCS_URL": "http://localhost:3001"
      }
    }
  }
}`}</code></pre>

      <h3>Option B: npx (no Docker)</h3>
      <p>
        Run the MCP server directly from the CLI source:
      </p>
      <pre><code>{`# From the repo root
cd cli && npm install && npm run mcp

# Or with npx
MARKDOCS_API_KEY=your-key MARKDOCS_URL=http://localhost:3001 npx tsx cli/src/mcp.ts`}</code></pre>

      <h3>Option C: Bundled binary</h3>
      <pre><code>{`# Build a single-file bundle
cd cli && npm run bundle

# Run it
MARKDOCS_API_KEY=your-key ./bundle/markdocs-mcp.cjs`}</code></pre>

      <h2>Client Configuration</h2>

      <h3>Claude Code</h3>
      <p>
        Add to your project{"'"}s <code>.mcp.json</code>:
      </p>
      <pre><code>{`{
  "mcpServers": {
    "markdocs": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-e", "MARKDOCS_URL", "-e", "MARKDOCS_API_KEY", "markdocs-mcp"],
      "env": {
        "MARKDOCS_API_KEY": "your-api-key",
        "MARKDOCS_URL": "http://host.docker.internal:3001"
      }
    }
  }
}`}</code></pre>

      <h3>Claude Desktop</h3>
      <p>
        Add to your <code>claude_desktop_config.json</code>:
      </p>
      <pre><code>{`{
  "mcpServers": {
    "markdocs": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-e", "MARKDOCS_URL", "-e", "MARKDOCS_API_KEY", "markdocs-mcp"],
      "env": {
        "MARKDOCS_API_KEY": "your-api-key",
        "MARKDOCS_URL": "http://host.docker.internal:3001"
      }
    }
  }
}`}</code></pre>

      <h3>Cursor / VS Code / Other</h3>
      <p>
        Any MCP-compatible client that supports stdio transport can connect using the
        same Docker command pattern above.
      </p>

      <h2>API Key</h2>
      <p>
        Generate an API key from <Link href="/settings">Settings</Link> in the
        MarkDocs dashboard. Set it as the <code>MARKDOCS_API_KEY</code> environment variable.
      </p>

      <h2>Available Tools</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left font-medium text-foreground">Tool</th>
              <th className="py-2 text-left font-medium text-foreground">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">list_documents</td>
              <td className="py-2">List all documents</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">create_document</td>
              <td className="py-2">Create a new document with title and optional content</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">get_document</td>
              <td className="py-2">Get document details by ID</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">delete_document</td>
              <td className="py-2">Soft-delete a document</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">list_comments</td>
              <td className="py-2">List comments with optional resolved filter</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">add_comment</td>
              <td className="py-2">Add an inline comment at a position range</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">resolve_comment</td>
              <td className="py-2">Mark a comment as resolved</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">delete_comment</td>
              <td className="py-2">Delete a comment</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">list_suggestions</td>
              <td className="py-2">List suggestions with optional status filter</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">add_suggestion</td>
              <td className="py-2">Propose a text replacement</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">accept_suggestion</td>
              <td className="py-2">Accept a pending suggestion</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">reject_suggestion</td>
              <td className="py-2">Reject a pending suggestion</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">get_history</td>
              <td className="py-2">Get edit history for a document</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">get_document_content</td>
              <td className="py-2">Get the markdown content of a document</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">update_document_content</td>
              <td className="py-2">Update the markdown content of a document</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">list_users</td>
              <td className="py-2">List all users in the workspace</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">list_collaborators</td>
              <td className="py-2">List collaborators on a document</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">share_document</td>
              <td className="py-2">Share a document with a user by handle</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">unshare_document</td>
              <td className="py-2">Remove a collaborator from a document</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Available Resources</h2>
      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left font-medium text-foreground">URI</th>
              <th className="py-2 text-left font-medium text-foreground">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">markdocs://documents</td>
              <td className="py-2">List all documents as JSON</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">{"markdocs://documents/{id}"}</td>
              <td className="py-2">Get a specific document as JSON</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Architecture</h2>
      <pre><code>{`┌─────────────────┐     stdio      ┌─────────────────┐
│  AI Agent       │ ◄────────────► │  MCP Server     │
│  (Claude, etc.) │                │  (Docker image) │
└─────────────────┘                └────────┬────────┘
                                            │ HTTP + API Key
                                   ┌────────▼────────┐
                                   │  MarkDocs App   │
                                   │  (Docker)       │
                                   └────────┬────────┘
                                            │ Prisma
                                   ┌────────▼────────┐
                                   │  PostgreSQL     │
                                   │  (Docker)       │
                                   └─────────────────┘`}</code></pre>
    </article>
  );
}
