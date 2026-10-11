import "./load-env.js";
import cypress from "cypress";

async function main() {
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

  if ((results as { status?: string }).status === "failed") {
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
