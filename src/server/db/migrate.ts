import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function migrationsDir(): string {
  return path.resolve(__dirname, "../../../db/migrations");
}

export async function migrate(db: Db): Promise<string[]> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = migrationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied: string[] = [];
  for (const file of files) {
    const id = file;
    const existing = await db.query("SELECT 1 FROM schema_migrations WHERE id = $1", [id]);
    if (existing.rowCount && existing.rowCount > 0) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
      await client.query("COMMIT");
      applied.push(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  return applied;
}

export async function requiredMigrationsApplied(db: Db): Promise<boolean> {
  try {
    const dir = migrationsDir();
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const result = await db.query("SELECT id FROM schema_migrations");
    const applied = new Set(result.rows.map((r: { id: string }) => r.id));
    return files.every((f) => applied.has(f));
  } catch {
    return false;
  }
}
