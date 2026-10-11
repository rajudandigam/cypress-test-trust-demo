import "./load-env.js";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import cypress from "cypress";
import { validateCypressRun } from "./lib/cypress-result.js";
import { computeAppIdentity, withBuiltServer } from "./lib/run-with-server.js";

type CaptureTarget = {
  variant: string;
  scenario: string;
  configFile: string;
  spec?: string;
};

/**
 * Capture structured matrix evidence for offline demo:verify.
 * Cloud-dependent variants (A/C) exit 2 when CYPRESS_PROJECT_ID/RECORD_KEY are missing.
 */
async function captureOne(target: CaptureTarget, metaBase: Record<string, string>) {
  const results = await cypress.run({
    configFile: target.configFile,
    spec: target.spec,
    browser: process.env.CYPRESS_BROWSER || "electron",
    headed: false,
  });

  const outDir = path.resolve("demo/evidence/raw/matrix");
  fs.mkdirSync(outDir, { recursive: true });
  const envelope = {
    meta: {
      ...metaBase,
      scenario: target.scenario,
      variant: target.variant,
      timestamp: new Date().toISOString(),
      runId: `${target.variant}-${target.scenario}-${Date.now()}`,
    },
    result: results,
  };
  const out = path.join(outDir, `${target.variant}-${target.scenario}.json`);
  fs.writeFileSync(out, JSON.stringify(envelope, null, 2));
  return out;
}

async function main() {
  const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
  const scenario = process.env.DEMO_SCENARIO || "healthy";
  const appIdentity = process.env.APP_IDENTITY || computeAppIdentity();
  process.env.APP_IDENTITY = appIdentity;
  process.env.DEMO_MODE = "true";
  process.env.DEMO_SCENARIO = scenario;

  let appCommit = "unknown";
  try {
    appCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    /* ignore */
  }

  const metaBase = {
    appCommit,
    dirtyHash: execSync("git status --porcelain", { encoding: "utf8" }).trim()
      ? "dirty"
      : "clean",
    browser: process.env.CYPRESS_BROWSER || "electron",
    cypressVersion: "16.1.1",
  };

  const targets: CaptureTarget[] = [
    {
      variant: "D",
      scenario,
      configFile: "cypress.critical.config.ts",
      spec: "cypress/e2e/critical/booking-contract.cy.ts",
    },
    {
      variant: "B",
      scenario,
      configFile: "cypress.comparison.config.ts",
      spec: "cypress/e2e/comparison/booking-shallow-exported.cy.ts",
    },
  ];

  const needsCloud = only === "A" || only === "C" || !only;
  if (
    needsCloud &&
    only &&
    (only === "A" || only === "C") &&
    (!process.env.CYPRESS_PROJECT_ID ||
      (!process.env.CYPRESS_RECORD_KEY && !process.env.CYPRESS_ALLOW_PROMPT_WITHOUT_RECORD))
  ) {
    console.error(
      JSON.stringify({
        ok: false,
        code: "CLOUD_PREREQUISITE_MISSING",
        message: "Capturing A/C requires Cypress Cloud projectId + record/login.",
      }),
    );
    process.exit(2);
  }

  const selected = only ? targets.filter((t) => t.variant === only) : targets.filter((t) => t.variant === "D" || t.variant === "B");

  await withBuiltServer({ scenario, appIdentity }, async () => {
    for (const target of selected) {
      const out = await captureOne(target, metaBase);
      // For expected-pass scenarios, surface suite validation immediately
      if (scenario === "healthy") {
        const raw = JSON.parse(fs.readFileSync(out, "utf8")) as { result: unknown };
        const v = validateCypressRun(raw.result as never, { mode: "suite" });
        console.log(JSON.stringify({ captured: out, verification: v }));
      } else {
        console.log(JSON.stringify({ captured: out }));
      }
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
