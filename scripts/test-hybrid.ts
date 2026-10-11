import "./load-env.js";
import cypress from "cypress";
import { validateCypressRun } from "./lib/cypress-result.js";

async function main() {
  if (!process.env.CYPRESS_PROJECT_ID) {
    console.error(
      JSON.stringify({
        ok: false,
        code: "CLOUD_PREREQUISITE_MISSING",
        message: "Hybrid prompt tests require CYPRESS_PROJECT_ID for native cy.prompt.",
      }),
    );
    process.exit(2);
  }
  if (!process.env.CYPRESS_RECORD_KEY && !process.env.CYPRESS_ALLOW_PROMPT_WITHOUT_RECORD) {
    console.error(
      JSON.stringify({
        ok: false,
        code: "CLOUD_PREREQUISITE_MISSING",
        message: "Hybrid prompt tests require Cypress Cloud access for native cy.prompt.",
      }),
    );
    process.exit(2);
  }

  const results = await cypress.run({
    configFile: "cypress.adaptive.config.ts",
    spec: "cypress/e2e/adaptive/booking-hybrid.cy.ts",
    browser: "chrome",
    headed: false,
    record: Boolean(process.env.CYPRESS_RECORD_KEY),
    key: process.env.CYPRESS_RECORD_KEY,
  });

  const verification = validateCypressRun(results as never, { mode: "suite" });
  if (!verification.ok) {
    console.error(JSON.stringify({ ok: false, verification }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, verification }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
