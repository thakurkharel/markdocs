import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".markdocs");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface Config {
  url?: string;
  apiKey?: string;
  token?: string; // JWT from login
  handle?: string;
}

export async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

/**
 * Resolve auth credentials in priority order:
 * 1. MARKDOCS_API_KEY env var
 * 2. apiKey from config file
 * 3. token (JWT) from config file
 */
export async function resolveAuth(): Promise<{
  url: string;
  authHeader: string | null;
}> {
  const config = await loadConfig();
  const url =
    process.env.MARKDOCS_URL || config.url || "http://localhost:3001";

  const envKey = process.env.MARKDOCS_API_KEY;
  if (envKey) {
    return { url, authHeader: `Bearer ${envKey}` };
  }
  if (config.apiKey) {
    return { url, authHeader: `Bearer ${config.apiKey}` };
  }
  if (config.token) {
    return { url, authHeader: `Bearer ${config.token}` };
  }
  return { url, authHeader: null };
}

export function configPath(): string {
  return CONFIG_FILE;
}
