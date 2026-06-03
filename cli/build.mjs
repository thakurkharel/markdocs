import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";

mkdirSync("bundle", { recursive: true });

// Bundle CLI
await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: "bundle/markdocs.cjs",
  minify: true,
});

// Bundle MCP server
await esbuild.build({
  entryPoints: ["src/mcp.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: "bundle/markdocs-mcp.cjs",
  minify: true,
});

// Prepend shebang (replace any existing one)
for (const file of ["bundle/markdocs.cjs", "bundle/markdocs-mcp.cjs"]) {
  let content = readFileSync(file, "utf-8");
  // Strip any existing shebangs
  content = content.replace(/^#!.*\n/gm, "");
  writeFileSync(file, `#!/usr/bin/env node\n${content}`);
  chmodSync(file, 0o755);
}

console.log("Built bundle/markdocs.cjs and bundle/markdocs-mcp.cjs");
