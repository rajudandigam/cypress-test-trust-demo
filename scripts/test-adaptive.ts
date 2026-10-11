import "./load-env.js";
import cypress from "cypress";

async function main() {
  if (!process.env.CYPRESS_RECORD_KEY && !process.env.CYPRESS_ALLOW_PROMPT_WITHOUT_RECORD) {
    console.error(
      JSON.stringify({
        ok: false,
        code: "CLOUD_PREREQUISITE_MISSING",
        message:
          "Native cy.prompt requires Cypress Cloud authentication. Set CYPRESS_RECORD_KEY for CI recording, or log in via cypress open locally. Do not mock cy.prompt.",
      }),
    );
    process.exit(2);
  }

  const results = await cypress.run({
    configFile: "cypress.adaptive.config.ts",
    browser: "chrome",
    headed: false,
    record: Boolean(process.env.CYPRESS_RECORD_KEY),
    key: process.env.CYPRESS_RECORD_KEY,
  });

  if ((results as { status?: string }).status === "failed") {
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, resultsStatus: (results as { status?: string }).status }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
