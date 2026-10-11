import "./load-env.js";
import { execSync, spawnSync } from "node:child_process";
import pg from "pg";

async function canConnect(url: string): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: url });
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

async function ensureNamedDatabase(adminUrl: string, dbName: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: adminUrl });
  try {
    const exists = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (!exists.rowCount) {
      await pool.query(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
      console.log(JSON.stringify({ createdDatabase: dbName }));
    }
  } finally {
    await pool.end();
  }
}

async function ensureDatabases(): Promise<void> {
  const urls = [process.env.DATABASE_URL, process.env.TEST_DATABASE_URL].filter(Boolean) as string[];
  for (const url of urls) {
    if (await canConnect(url)) continue;
    const dbName = new URL(url).pathname.replace(/^\//, "");
    const admin = url.replace(/\/[^/]+$/, "/postgres");
    await ensureNamedDatabase(admin, dbName);
  }
}

async function main() {
  const demoUrl = process.env.DATABASE_URL;
  if (!demoUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!(await canConnect(demoUrl))) {
    if (hasDocker()) {
      console.log("Starting postgres via docker compose…");
      execSync("docker compose up -d", { stdio: "inherit" });
      for (let i = 0; i < 30; i++) {
        if (await canConnect(demoUrl)) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
    } else {
      const brewPg = spawnSync("brew", ["services", "list"], { encoding: "utf8" });
      if (brewPg.status === 0 && brewPg.stdout.includes("postgresql@16")) {
        console.log("Docker unavailable; ensuring Homebrew postgresql@16 is started…");
        spawnSync("brew", ["services", "start", "postgresql@16"], { stdio: "inherit" });
        for (let i = 0; i < 20; i++) {
          if (await canConnect(demoUrl)) break;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }
  }

  if (!(await canConnect(demoUrl))) {
    throw new Error(
      "Could not start PostgreSQL. Install Docker (preferred) or PostgreSQL 16, then set DATABASE_URL.",
    );
  }

  await ensureDatabases();
  console.log("PostgreSQL ready (demo DB and test DB ensured when configured)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
