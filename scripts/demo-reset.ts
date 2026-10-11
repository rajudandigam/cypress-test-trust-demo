import "./load-env.js";
import { loadConfig, assertSafeDatabaseUrl } from "../src/server/config.js";
import { createPool } from "../src/server/db/pool.js";
import { resetDemoData } from "../src/server/db/seed.js";

async function main() {
  if ((process.env.DEMO_MODE || "").toLowerCase() !== "true") {
    throw new Error("demo:reset requires DEMO_MODE=true");
  }
  const config = loadConfig();
  assertSafeDatabaseUrl(config.databaseUrl, config.allowedDbNamePattern);
  const db = createPool(config.databaseUrl);
  try {
    await resetDemoData(db, config.seedPassword);
    console.log(JSON.stringify({ reset: true, database: config.databaseUrl.split("/").pop() }));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
