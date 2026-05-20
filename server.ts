import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { parse } from "node:url";
import { setupWebSocket } from "./src/lib/ws.js";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  setupWebSocket(server);

  server.listen(port, () => {
    console.log(`MarkDocs running on http://localhost:${port}`);
  });
});
