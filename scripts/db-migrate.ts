import "./load-env.js";
import { loadConfig, assertSafeDatabaseUrl } from "../src/server/config.js";
import { createPool } from "../src/server/db/pool.js";
import { migrate } from "../src/server/db/migrate.js";

async function main() {
  const config = loadConfig();
  assertSafeDatabaseUrl(config.databaseUrl, config.allowedDbNamePattern);
  const db = createPool(config.databaseUrl);
  try {
    const applied = await migrate(db);
    console.log(JSON.stringify({ applied, count: applied.length }));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
