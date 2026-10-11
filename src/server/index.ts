import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { createApp } from "./app.js";

function loadDotEnvIfPresent() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadDotEnvIfPresent();
  const config = loadConfig();
  if (!config.demoMode && process.env.DEMO_SCENARIO && process.env.DEMO_SCENARIO !== "healthy") {
    throw new Error("Non-healthy DEMO_SCENARIO requires DEMO_MODE=true");
  }

  const db = createPool(config.databaseUrl);
  const app = createApp(config, db);
  const listenPort = config.nodeEnv === "production" ? config.port : config.apiPort;

  const server = app.listen(listenPort, "127.0.0.1", () => {
    console.log(
      JSON.stringify({
        event: "server_started",
        port: listenPort,
        mode: config.nodeEnv,
        scenario: config.scenario,
        demoMode: config.demoMode,
      }),
    );
  });

  const shutdown = async () => {
    server.close();
    await db.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
