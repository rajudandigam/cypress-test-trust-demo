import "./load-env.js";
import fs from "node:fs";
import path from "node:path";
import cypress from "cypress";
import {
  REQUIRED_SPEC_PATHS,
  REQUIRED_TEST_IDENTITIES,
} from "../cypress/contracts/booking-contract.js";
import { verifyRequiredResults } from "./lib/result-verifier.js";
import { runPolicyCheck } from "./lib/policy-check.js";
import { withBuiltServer } from "./lib/run-with-server.js";

async function main() {
  const policy = runPolicyCheck();
  if (policy.length) {
    console.error(JSON.stringify({ ok: false, stage: "policy", findings: policy }, null, 2));
    process.exit(1);
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.resolve("scripts/required-manifest.json"), "utf8"),
  );
  for (const spec of REQUIRED_SPEC_PATHS) {
    if (!manifest.requiredSpecPaths.includes(spec)) {
      throw new Error(`Manifest missing required spec ${spec}`);
    }
  }

  await withBuiltServer(async () => {
    const results = await cypress.run({
      configFile: "cypress.critical.config.ts",
      browser: "electron",
      headed: false,
    });

    const outDir = path.resolve("demo/evidence/raw");
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultPath = path.join(outDir, `critical-${stamp}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));

    const verification = verifyRequiredResults(
      results as never,
      REQUIRED_TEST_IDENTITIES,
    );
    if (!verification.ok) {
      console.error(
        JSON.stringify(
          { ok: false, stage: "verify", verification, resultPath },
          null,
          2,
        ),
      );
      process.exit(1);
    }

    console.log(
      JSON.stringify(
        { ok: true, identities: verification.identities, resultPath },
        null,
        2,
      ),
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
