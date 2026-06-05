import Link from "next/link";

export default function CLIDocsPage() {
  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>CLI Reference</h1>
      <p className="lead">
        The MarkDocs CLI lets you manage documents, comments, and suggestions directly
        from your terminal.
      </p>

      <h2>Installation</h2>
      <pre><code>{`curl -fsSL https://markdocs.sh/install.sh | bash`}</code></pre>

      <p>
        Requires Node.js 18 or later. The installer downloads pre-built binaries
        to <code>/usr/local/bin</code>.
      </p>

      <h2>Setup</h2>
      <ol>
        <li>
          <Link href="/sign-up">Create an account</Link> if you haven{"'"}t already.
        </li>
        <li>
          Go to <Link href="/settings">Settings</Link> and create an API key.
        </li>
        <li>Add to your shell profile (<code>~/.zshrc</code>, <code>~/.bashrc</code>, etc.):</li>
      </ol>
      <pre><code>{`export MARKDOCS_API_KEY=mdk_your_key_here
export MARKDOCS_URL=https://markdocs.sh`}</code></pre>

      <h2>Commands</h2>

      <h3>Documents</h3>
      <pre><code>{`# List all documents
markdocs list

# Create a new document
markdocs create "My Document"

# Create from a file
markdocs create "README" --file ./README.md

# View document details
markdocs view <document-id>

# Open in browser
markdocs open <document-id>

# Delete a document
markdocs delete <document-id>`}</code></pre>

      <h3>Comments</h3>
      <pre><code>{`# List comments on a document
markdocs comment list <document-id>

# Add a comment
markdocs comment add <document-id> \\
  --content "This needs clarification" \\
  --from 42 --to 67

# Resolve a comment
markdocs comment resolve <comment-id>

# Delete a comment
markdocs comment delete <comment-id>`}</code></pre>

      <h3>Suggestions</h3>
      <pre><code>{`# List suggestions
markdocs suggest list <document-id>

# Add a suggestion
markdocs suggest add <document-id> \\
  --original "old text" \\
  --suggested "new text" \\
  --from 10 --to 18

# Accept a suggestion
markdocs suggest accept <suggestion-id>

# Reject a suggestion
markdocs suggest reject <suggestion-id>`}</code></pre>

      <h3>History</h3>
      <pre><code>{`# View edit history
markdocs history <document-id>`}</code></pre>

      <h3>MCP Server</h3>
      <pre><code>{`# Start the MCP server (stdio transport)
markdocs mcp`}</code></pre>

      <h2>Examples</h2>

      <h3>Create and comment workflow</h3>
      <pre><code>{`# Create a doc
markdocs create "Sprint Planning"

# Output: Document created: 8f4a2b...

# Add a comment
markdocs comment add 8f4a2b... \\
  --content "Should we break this into smaller tasks?" \\
  --from 0 --to 50

# List comments
markdocs comment list 8f4a2b...`}</code></pre>

      <h3>Suggestion review workflow</h3>
      <pre><code>{`# List pending suggestions
markdocs suggest list <doc-id>

# Accept the good ones
markdocs suggest accept <suggestion-id>

# Reject the rest
markdocs suggest reject <suggestion-id>`}</code></pre>
    </article>
  );
}
