import Link from "next/link";

export default function MCPDocsPage() {
  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>MCP Server Setup</h1>
      <p className="lead">
        Connect AI agents like Claude to MarkDocs using the
        Model Context Protocol (MCP). Your AI can create documents, leave comments,
        make suggestions, and review edit history.
      </p>

      <h2>What is MCP?</h2>
      <p>
        The <strong>Model Context Protocol</strong> is an open standard for connecting
        AI models to external tools and data sources. MarkDocs implements an MCP server
        that exposes 13 tools and 2 resources, allowing any MCP-compatible AI agent to
        interact with your documents.
      </p>

      <h2>Quick Setup</h2>

      <h3>1. Install the CLI</h3>
      <pre><code>{`curl -fsSL https://markdocs.sh/install.sh | bash`}</code></pre>

      <h3>2. Get your API key</h3>
      <p>
        Go to <Link href="/settings">Settings</Link> in your MarkDocs dashboard and create an API key.
        You{"'"}ll need this for the MCP server configuration.
      </p>

      <h3>3. Configure Claude Desktop</h3>
      <p>
        Add this to your <code>claude_desktop_config.json</code>:
      </p>
      <pre><code>{`{
  "mcpServers": {
    "markdocs": {
      "command": "markdocs-mcp",
      "env": {
        "MARKDOCS_API_KEY": "mdk_your_key_here",
        "MARKDOCS_URL": "https://markdocs.sh"
      }
    }
  }
}`}</code></pre>

      <h3>4. Configure Claude Code</h3>
      <p>
        Add to your project{"'"}s <code>.mcp.json</code>:
      </p>
      <pre><code>{`{
  "mcpServers": {
    "markdocs": {
      "command": "markdocs-mcp",
      "env": {
        "MARKDOCS_API_KEY": "mdk_your_key_here",
        "MARKDOCS_URL": "https://markdocs.sh"
      }
    }
  }
}`}</code></pre>

      <h3>5. Other MCP clients</h3>
      <p>
        Any MCP-compatible client can connect using stdio transport:
      </p>
      <pre><code>{`# Run the MCP server directly
MARKDOCS_API_KEY=mdk_your_key MARKDOCS_URL=https://markdocs.sh markdocs mcp`}</code></pre>

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
│  (Claude, etc.) │                │  (markdocs-mcp) │
└─────────────────┘                └────────┬────────┘
                                            │ HTTPS + API Key
                                   ┌────────▼────────┐
                                   │  MarkDocs API   │
                                   │  markdocs.sh    │
                                   └────────┬────────┘
                                            │ Prisma
                                   ┌────────▼────────┐
                                   │  PostgreSQL     │
                                   │                 │
                                   └─────────────────┘`}</code></pre>
    </article>
  );
}
