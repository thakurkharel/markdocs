import Link from "next/link";

export default function AgentSetupPage() {
  return (
    <article className="prose prose-sm dark:prose-invert max-w-none">
      <h1>Agent Setup</h1>
      <p className="lead">
        Connect AI agents to MarkDocs. Your agent can create documents, leave comments,
        make suggestions, and review edit history — all through the API or MCP.
      </p>

      <div className="not-prose mb-8 rounded-lg border border-border bg-muted/30 p-5">
        <p className="text-sm font-medium text-foreground mb-2">
          Paste this into any AI agent to get started:
        </p>
        <pre className="overflow-x-auto rounded-md bg-background border border-border p-4 text-xs text-foreground">
{`Read https://markdocs.sh/agent-setup.md and install MarkDocs for this agent.`}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          The agent will read the setup guide and configure itself automatically.
        </p>
      </div>

      <h2>How it works</h2>
      <p>
        MarkDocs exposes a machine-readable setup guide at{" "}
        <code>/agent-setup.md</code> that any AI agent can fetch and follow.
        It covers authentication, MCP configuration, and the full REST API.
      </p>

      <h2>Quick install by platform</h2>

      <h3>Claude Code</h3>
      <p>Tell your agent:</p>
      <pre><code>{`Read https://markdocs.sh/agent-setup.md and install MarkDocs for this agent.`}</code></pre>
      <p>
        Or add directly to your project{"'"}s <code>.mcp.json</code>:
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

      <h3>Claude Desktop</h3>
      <p>
        Add to your <code>claude_desktop_config.json</code>:
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

      <h3>Codex / OpenClaw / Other agents</h3>
      <p>
        If the agent supports MCP, use the config above. If it can only make HTTP
        requests, it can use the REST API directly — all endpoints are documented
        in the <a href="/agent-setup.md">agent-setup.md</a> file.
      </p>

      <h2>Prerequisites</h2>
      <ol>
        <li>
          <Link href="/sign-up">Create an account</Link> if you haven{"'"}t already.
        </li>
        <li>
          Go to <Link href="/settings">Settings</Link> and create an API key.
        </li>
        <li>
          Install the CLI (includes MCP server):
        </li>
      </ol>
      <pre><code>{`curl -fsSL https://markdocs.sh/install.sh | bash`}</code></pre>

      <h2>What agents can do</h2>
      <div className="not-prose">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Documents", desc: "Create, read, update, and delete markdown documents" },
            { title: "Comments", desc: "Leave inline comments at specific positions, resolve when done" },
            { title: "Suggestions", desc: "Propose text changes that humans can accept or reject" },
            { title: "History", desc: "View who changed what and when for full provenance" },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <h2>Verify setup</h2>
      <p>Test that your API key works:</p>
      <pre><code>{`curl -s https://markdocs.sh/api/documents \\
  -H "Authorization: Bearer mdk_your_key_here"`}</code></pre>
      <p>
        You should get a JSON array of documents. If you get <code>401 Unauthorized</code>,
        check that your API key is correct and hasn{"'"}t been revoked.
      </p>

      <h2>Full reference</h2>
      <ul>
        <li>
          <a href="/agent-setup.md">agent-setup.md</a> — Machine-readable setup guide (for agents)
        </li>
        <li>
          <Link href="/docs/mcp">MCP Server docs</Link> — Full MCP tool reference
        </li>
        <li>
          <Link href="/docs/cli">CLI docs</Link> — Command-line interface reference
        </li>
        <li>
          <Link href="/docs">All documentation</Link>
        </li>
      </ul>
    </article>
  );
}
