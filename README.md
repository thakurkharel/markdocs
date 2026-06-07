# MarkDocs

Self-hosted collaborative markdown editor with real-time editing, threaded comments, inline suggestions, and AI agent support via MCP.

## Features

- **Real-time collaboration** — Live cursors, presence indicators, conflict-free editing via Yjs CRDTs
- **Threaded comments** — Inline comments anchored to text, with replies, resolve/unresolve
- **Suggestions** — Propose text replacements with accept/reject workflow
- **MCP server** — 23 tools over stdio for AI agents (Claude, Cursor, etc.)
- **CLI** — Full document, comment, suggestion, and sharing management from the terminal
- **Sharing** — Per-document access control with editor/viewer roles
- **Edit history** — Full provenance tracking with author attribution and source (web/api/mcp)
- **Self-hosted** — Docker Compose, PostgreSQL, no external dependencies

## Quick Start

```bash
git clone https://github.com/thakurkharel/markdocs.git
cd markdocs
cp .env.example .env
docker compose up -d
```

Open [http://localhost:3001](http://localhost:3001) and create your account.

## Local Development

```bash
# Start just the database
docker compose up -d db

# Install dependencies and set up the database
npm install
npx prisma db push

# Start the dev server
npm run dev
```

## CLI

Install the CLI for terminal and agent access:

```bash
curl -fsSL https://markdocs.sh/install.sh | bash
```

Sign up (or log in) and create an API key:

```bash
markdocs signup --url http://localhost:3001 --handle yourhandle --name "Your Name"
markdocs setup
```

Then use it:

```bash
markdocs list
markdocs create "Project Spec"
markdocs replace <doc-id> --find "old text" --replace "new text"
markdocs comment add <doc-id> --content "Fix this" --on "the text"
markdocs share add <doc-id> @teammate
```

## MCP Server

Connect AI agents to MarkDocs. Add to your MCP client config (`.mcp.json`, `claude_desktop_config.json`, etc.):

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

The client spawns `markdocs mcp` automatically. 23 tools available: document CRUD, text-based editing, threaded comments, suggestions, sharing, and history.

## Deploy

### Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with a strong POSTGRES_PASSWORD and JWT_SECRET
docker compose up -d
```

### Railway

The repo includes a `railway.toml`. Add a PostgreSQL service, set `JWT_SECRET`, and deploy.

### Render / Fly.io

See the [self-hosting docs](https://markdocs.sh/docs/self-hosting) for platform-specific instructions.

## Project Structure

```
markdocs/
├── src/
│   ├── app/                  # Next.js pages and API routes
│   │   ├── api/
│   │   │   ├── auth/         # Login, signup, logout
│   │   │   ├── documents/    # CRUD, content, edit, collaborators, history
│   │   │   ├── comments/     # Reply, resolve, unresolve, delete
│   │   │   ├── suggestions/  # Accept, reject
│   │   │   ├── keys/         # API key management
│   │   │   ├── invites/      # Invite link generation
│   │   │   └── users/        # User listing
│   │   ├── dashboard/        # Document list
│   │   ├── doc/[id]/         # Collaborative editor
│   │   └── settings/         # API keys, invites
│   ├── components/           # React components (shadcn/ui)
│   └── lib/                  # Auth, Prisma, Yjs utilities
├── cli/
│   └── src/
│       ├── index.ts          # CLI commands
│       ├── mcp.ts            # MCP server (23 tools, 2 resources)
│       ├── client.ts         # HTTP client
│       └── config.ts         # ~/.markdocs/config.json
├── prisma/
│   └── schema.prisma         # Database schema
├── server.ts                 # Custom server (Next.js + WebSocket)
├── Dockerfile                # App container
├── docker-compose.yml        # Full stack (app + postgres)
└── railway.toml              # Railway deployment config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui |
| Editor | CodeMirror 6, Yjs, y-codemirror.next |
| Real-time | WebSockets, Yjs CRDTs |
| Backend | Next.js API routes, custom WebSocket server |
| Database | PostgreSQL via Prisma |
| Auth | Handle-based with bcrypt + JWT, API keys |
| CLI | Commander.js |
| MCP | @modelcontextprotocol/sdk (stdio) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes | Same as DATABASE_URL (for Prisma) |
| `JWT_SECRET` | Yes | Secret for signing auth tokens |
| `PORT` | No | Server port (default: 3001) |
| `POSTGRES_PASSWORD` | Docker only | Password for the Docker Postgres instance |

## Documentation

Full docs at [markdocs.sh/docs](https://markdocs.sh/docs):

- [Getting Started](https://markdocs.sh/docs/getting-started)
- [CLI Reference](https://markdocs.sh/docs/cli)
- [MCP Server](https://markdocs.sh/docs/mcp)
- [Agent Setup](https://markdocs.sh/docs/agent-setup)
- [Self-Hosting](https://markdocs.sh/docs/self-hosting)
- [Architecture](https://markdocs.sh/docs/architecture)

## License

MIT
