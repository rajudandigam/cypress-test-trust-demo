import "./load-env.js";
import fs from "node:fs";
import path from "node:path";
import {
  classifyFailure,
  matchesExpectedDefect,
  type FailureClass,
} from "./lib/result-verifier.js";

type MatrixRow = {
  variant: "A" | "B" | "C" | "D";
  scenario: string;
  expected: "pass" | FailureClass;
  observed?: "pass" | "fail";
  failureClass?: FailureClass;
  rawError?: string;
  matchedExpectedDefect?: boolean;
};

/**
 * Comparison matrix runner.
 * Reads previously captured Cypress structured results under demo/evidence/raw/matrix/
 * and classifies outcomes. Does not turn expected failures into green E2E tests.
 */
function main() {
  const dir = path.resolve("demo/evidence/raw/matrix");
  if (!fs.existsSync(dir)) {
    console.error(
      JSON.stringify({
        ok: false,
        code: "NO_MATRIX_EVIDENCE",
        message:
          "No matrix evidence yet. Capture per-variant Cypress results into demo/evidence/raw/matrix/ first.",
      }),
    );
    process.exit(2);
  }

  const rows: MatrixRow[] = JSON.parse(
    fs.readFileSync(path.join(dir, "expected-matrix.json"), "utf8"),
  );

  const report = rows.map((row) => {
    const resultFile = path.join(dir, `${row.variant}-${row.scenario}.json`);
    if (!fs.existsSync(resultFile)) {
      return {
        ...row,
        observed: "fail" as const,
        failureClass: "SETUP_FAILURE" as const,
        rawError: `Missing result file ${resultFile}`,
        matchedExpectedDefect: false,
      };
    }
    const raw = JSON.parse(fs.readFileSync(resultFile, "utf8")) as {
      status?: string;
      runs?: Array<{ tests?: Array<{ state?: string; displayError?: string | null }> }>;
    };
    const failedTest = (raw.runs || [])
      .flatMap((r) => r.tests || [])
      .find((t) => t.state === "failed");
    if (!failedTest && raw.status !== "failed") {
      return {
        ...row,
        observed: "pass" as const,
        matchedExpectedDefect: row.expected === "pass",
      };
    }
    const msg = failedTest?.displayError || "failed";
    const failureClass = classifyFailure(msg);
    return {
      ...row,
      observed: "fail" as const,
      failureClass,
      rawError: msg,
      matchedExpectedDefect:
        row.expected !== "pass" && matchesExpectedDefect(msg, row.expected),
    };
  });

  const out = path.resolve("demo/evidence/matrix-report.json");
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));

  const bad = report.filter((r) => {
    if (r.expected === "pass") return r.observed !== "pass";
    return !r.matchedExpectedDefect;
  });

  console.log(JSON.stringify({ ok: bad.length === 0, out, badCount: bad.length, report }, null, 2));
  if (bad.length) process.exit(1);
}

main();
