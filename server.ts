import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { parse } from "node:url";
import { setupWebSocket } from "./src/lib/ws.js";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// Create the HTTP server first, attach WebSocket before Next.js
const server = createServer((req, res) => {
  const parsedUrl = parse(req.url!, true);
  handle(req, res, parsedUrl);
});

// Attach WebSocket upgrade handler BEFORE app.prepare() so it
// takes priority over Next.js's own HMR upgrade handler.
setupWebSocket(server);

app.prepare().then(() => {
  server.listen(port, () => {
    console.log(`MarkDocs running on http://localhost:${port}`);
  });
});
