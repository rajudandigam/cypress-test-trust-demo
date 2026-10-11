import "./load-env.js";
import { execSync, spawnSync } from "node:child_process";
import pg from "pg";

async function canConnect(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

function hasDocker(): boolean {
  const result = spawnSync("docker", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

async function main() {
  if (await canConnect()) {
    console.log("PostgreSQL already reachable via DATABASE_URL");
    return;
  }

  if (hasDocker()) {
    console.log("Starting postgres via docker compose…");
    execSync("docker compose up -d", { stdio: "inherit" });
    for (let i = 0; i < 30; i++) {
      if (await canConnect()) {
        console.log("PostgreSQL is ready");
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error("Timed out waiting for docker postgres");
  }

  // Homebrew fallback used on this machine during initial build
  const brewPg = spawnSync("brew", ["services", "list"], { encoding: "utf8" });
  if (brewPg.status === 0 && brewPg.stdout.includes("postgresql@16")) {
    console.log("Docker unavailable; ensuring Homebrew postgresql@16 is started…");
    spawnSync("brew", ["services", "start", "postgresql@16"], { stdio: "inherit" });
    for (let i = 0; i < 20; i++) {
      if (await canConnect()) {
        console.log("PostgreSQL is ready (Homebrew)");
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error(
    "Could not start PostgreSQL. Install Docker (preferred) or PostgreSQL 16, then set DATABASE_URL.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
