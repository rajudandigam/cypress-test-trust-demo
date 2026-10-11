import { defineConfig } from "cypress";
import pg from "pg";
import { loadEnvFile } from "./scripts/load-env";
import { assertSafeDatabaseUrl } from "./src/server/config";
import { resetDemoData } from "./src/server/db/seed";

loadEnvFile();

async function resetDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required for Cypress tasks");
  assertSafeDatabaseUrl(url, process.env.ALLOWED_DB_NAME_PATTERN || "cypress_test_trust_demo");
  const pool = new pg.Pool({ connectionString: url });
  try {
    await resetDemoData(pool, process.env.SEED_PASSWORD || "Password123!");
    return null;
  } finally {
    await pool.end();
  }
}

export default defineConfig({
  projectId: process.env.CYPRESS_PROJECT_ID || "cttdemo",
  retries: 0,
  video: false,
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || "http://127.0.0.1:3000",
    // Prefer IPv4 loopback; some runners resolve localhost to ::1.
    supportFile: "cypress/support/critical.ts",
    specPattern: "cypress/e2e/critical/**/*.cy.ts",
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",
    viewportWidth: 1440,
    viewportHeight: 900,
    setupNodeEvents(on, config) {
      on("task", {
        "db:reset": async () => resetDb(),
      });
      config.expose = {
        ...(config.expose || {}),
        publicAppName: "cypress-test-trust-demo",
      };
      return config;
    },
  },
});
