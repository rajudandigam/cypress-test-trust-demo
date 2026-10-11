import { parseScenario } from "../domain/scenario.js";
import type { DemoScenario } from "../domain/types.js";
import { createClock, type Clock } from "../domain/clock.js";

export type AppConfig = {
  nodeEnv: string;
  port: number;
  apiPort: number;
  databaseUrl: string;
  sessionSecret: string;
  cookieName: string;
  demoMode: boolean;
  scenario: DemoScenario;
  clock: Clock;
  allowedDbNamePattern: string;
  seedPassword: string;
};

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const demoMode = (env.DEMO_MODE || "false").toLowerCase() === "true";
  const scenario = parseScenario(env.DEMO_SCENARIO || "healthy");
  const fixedNow = demoMode ? env.DEMO_FIXED_NOW : undefined;

  return {
    nodeEnv: env.NODE_ENV || "development",
    port: Number(env.PORT || 3000),
    apiPort: Number(env.API_PORT || 3001),
    databaseUrl: required("DATABASE_URL"),
    sessionSecret: required("SESSION_SECRET", "dev-only-session-secret-change-me"),
    cookieName: env.COOKIE_NAME || "cttd_session",
    demoMode,
    scenario,
    clock: createClock(fixedNow),
    allowedDbNamePattern: env.ALLOWED_DB_NAME_PATTERN || "cypress_test_trust_demo",
    seedPassword: env.SEED_PASSWORD || "Password123!",
  };
}

export function assertSafeDatabaseUrl(url: string, pattern: string): void {
  const parsed = new URL(url);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.includes(pattern)) {
    throw new Error(
      `Refusing database operation: database name "${dbName}" does not match allowed pattern "${pattern}"`,
    );
  }
  if (parsed.hostname === "prod" || dbName.includes("production")) {
    throw new Error(`Refusing destructive operation against unexpected host/db: ${dbName}`);
  }
}
