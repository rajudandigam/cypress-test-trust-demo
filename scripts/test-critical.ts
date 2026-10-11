import "./load-env.js";
import fs from "node:fs";
import path from "node:path";
import cypress from "cypress";
import { loadRequiredManifest, validateCypressRun } from "./lib/cypress-result.js";
import { runPolicyCheck } from "./lib/policy-check.js";
import { computeAppIdentity, withBuiltServer } from "./lib/run-with-server.js";

async function main() {
  let exitCode = 0;
  try {
    const policy = runPolicyCheck();
    if (policy.length) {
      console.error(JSON.stringify({ ok: false, stage: "policy", findings: policy }, null, 2));
      exitCode = 1;
      return;
    }

    const manifest = loadRequiredManifest();
    const scenario = process.env.DEMO_SCENARIO || "healthy";
    const appIdentity = process.env.APP_IDENTITY || computeAppIdentity();
    process.env.APP_IDENTITY = appIdentity;
    process.env.DEMO_MODE = "true";
    process.env.DEMO_SCENARIO = scenario;

    await withBuiltServer({ scenario, appIdentity }, async () => {
      const results = await cypress.run({
        configFile: "cypress.critical.config.ts",
        browser: process.env.CYPRESS_BROWSER || "electron",
        headed: false,
      });

      const outDir = path.resolve("demo/evidence/raw");
      fs.mkdirSync(outDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const resultPath = path.join(outDir, `critical-${stamp}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));

      const verification = validateCypressRun(results as never, {
        mode: "required",
        requiredCases: manifest.requiredCases,
      });
      if (!verification.ok) {
        console.error(
          JSON.stringify({ ok: false, stage: "verify", verification, resultPath }, null, 2),
        );
        exitCode = 1;
        return;
      }

      console.log(
        JSON.stringify(
          { ok: true, identities: verification.matchedIds, resultPath, appIdentity, scenario },
          null,
          2,
        ),
      );
    });
  } catch (error) {
    console.error(error);
    exitCode = 1;
  } finally {
    process.exitCode = exitCode;
  }
}

main();
