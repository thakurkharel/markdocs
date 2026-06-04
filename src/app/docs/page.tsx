import Link from "next/link";

export default function DocsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1>MarkDocs Documentation</h1>
      <p className="lead">
        MarkDocs is a collaborative markdown editor with real-time multiplayer editing,
        comments, suggestions, and AI agent integration via MCP.
      </p>

      <h2>Getting Started</h2>
      <ol>
        <li>
          <strong>Sign up</strong> at the{" "}
          <Link href="/">landing page</Link> using your email or social login.
        </li>
        <li>
          Create your first document from the{" "}
          <Link href="/dashboard">dashboard</Link>.
        </li>
        <li>Share the document URL with collaborators for real-time editing.</li>
      </ol>

      <h2>Features</h2>
      <ul>
        <li>
          <strong>Real-time collaboration</strong> — Multiple users can edit simultaneously
          with live cursors and presence indicators.
        </li>
        <li>
          <strong>Markdown-first</strong> — Write in markdown with syntax highlighting,
          live preview, and GFM support.
        </li>
        <li>
          <strong>Comments</strong> — Select text and leave inline comments. Resolve them
          when addressed.
        </li>
        <li>
          <strong>Suggestions</strong> — Propose text changes that can be accepted or
          rejected by editors.
        </li>
        <li>
          <strong>Edit history</strong> — Track who changed what and when.
        </li>
        <li>
          <strong>Organizations</strong> — Multi-tenant workspaces with role-based access
          (owner, admin, member, viewer).
        </li>
      </ul>

      <h2>Integrations</h2>
      <div className="not-prose grid gap-4 sm:grid-cols-2">
        <Link
          href="/docs/cli"
          className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
        >
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
            CLI
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage documents, comments, and suggestions from the terminal.
          </p>
        </Link>
        <Link
          href="/docs/mcp"
          className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
        >
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
            MCP Server
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect AI agents (Claude, GPT, etc.) to MarkDocs via Model Context Protocol.
          </p>
        </Link>
      </div>

      <h2>API Authentication</h2>
      <p>
        MarkDocs supports two authentication methods:
      </p>
      <ul>
        <li>
          <strong>Browser sessions</strong> — Handled automatically by Clerk when you sign in.
        </li>
        <li>
          <strong>API keys</strong> — For CLI and MCP access. Set the{" "}
          <code>MARKDOCS_API_KEY</code> environment variable on both the server and client.
        </li>
      </ul>
      <pre><code>{`# Server .env
MARKDOCS_API_KEY=your-secret-key
MARKDOCS_SERVICE_USER_ID=user_xxx  # Your Clerk user ID

# Client
export MARKDOCS_API_KEY=your-secret-key`}</code></pre>
    </article>
  );
}
