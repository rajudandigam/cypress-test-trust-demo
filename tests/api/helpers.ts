import "../setup-env";
import { loadConfig } from "../../src/server/config.js";
import { createPool, type Db } from "../../src/server/db/pool.js";
import { migrate } from "../../src/server/db/migrate.js";
import { resetDemoData } from "../../src/server/db/seed.js";
import { createApp } from "../../src/server/app.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

export async function startTestApp(scenario = "healthy") {
  process.env.DEMO_MODE = "true";
  process.env.DEMO_SCENARIO = scenario;
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    "postgresql://cypress_demo:cypress_demo@127.0.0.1:5432/cypress_test_trust_demo_test";

  const config = loadConfig();
  const db = createPool(config.databaseUrl);
  await migrate(db);
  await resetDemoData(db, config.seedPassword);
  const app = createApp(config, db);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    db,
    config,
    baseUrl,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      await db.end();
    },
  };
}

export async function login(
  baseUrl: string,
  email = "alex@example.test",
  password = "Password123!",
) {
  const response = await fetch(`${baseUrl}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = response.headers.getSetCookie?.() || [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const body = (await response.json()) as { user: unknown };
  return { status: response.status, cookie, body };
}

export async function authedJson(
  baseUrl: string,
  cookie: string,
  path: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Cookie", cookie);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body };
}

export type { Db };
