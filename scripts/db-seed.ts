import "./load-env.js";
import { loadConfig, assertSafeDatabaseUrl } from "../src/server/config.js";
import { createPool } from "../src/server/db/pool.js";
import { seed } from "../src/server/db/seed.js";

async function main() {
  const config = loadConfig();
  assertSafeDatabaseUrl(config.databaseUrl, config.allowedDbNamePattern);
  const db = createPool(config.databaseUrl);
  try {
    await seed(db, config.seedPassword);
    console.log(JSON.stringify({ seeded: true }));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
