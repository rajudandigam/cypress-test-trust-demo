import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { createApp } from "./app.js";

async function main() {
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
