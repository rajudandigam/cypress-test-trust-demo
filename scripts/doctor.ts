import "./load-env.js";
import { execSync } from "node:child_process";
import fs from "node:fs";
import pg from "pg";

function safe(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
}

async function main() {
  const report: Record<string, unknown> = {
    node: process.version,
    npm: safe("npm -v"),
    cypressPackage: fs.existsSync("node_modules/cypress/package.json")
      ? JSON.parse(fs.readFileSync("node_modules/cypress/package.json", "utf8")).version
      : "not installed",
    docker: safe("docker --version"),
    psql: safe("psql --version"),
    envFile: fs.existsSync(".env"),
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
  };

  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query("SELECT current_database() AS db, version() AS version");
      report.database = {
        reachable: true,
        name: result.rows[0].db,
        version: String(result.rows[0].version).split(",")[0],
      };
    } catch (error) {
      report.database = {
        reachable: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await pool.end();
    }
  }

  const gaps: string[] = [];
  if (!report.envFile) gaps.push("Copy .env.example to .env");
  if (!(report.database as { reachable?: boolean } | undefined)?.reachable) {
    gaps.push("Start PostgreSQL (npm run db:up) and ensure DATABASE_URL is valid");
  }
  if (report.cypressPackage === "not installed") gaps.push("Run npm install");
  report.setupGaps = gaps;

  console.log(JSON.stringify(report, null, 2));
  if (gaps.length) process.exitCode = 1;
}

main();
