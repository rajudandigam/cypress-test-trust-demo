import "./load-env.js";
import fs from "node:fs";
import path from "node:path";
import {
  classifyFailure,
  isIntendedBookingStatusDefect,
  validateCypressRun,
  type CypressRunResult,
  type FailureClass,
} from "./lib/cypress-result.js";

type MatrixRow = {
  variant: "A" | "B" | "C" | "D" | "STYLE" | "LOCATOR";
  scenario: string;
  expected: "pass" | FailureClass | "observation";
  expectedIds?: string[];
};

type EvidenceEnvelope = {
  meta: {
    appCommit: string;
    testCommit?: string;
    dirtyHash?: string;
    scenario: string;
    variant: string;
    browser?: string;
    cypressVersion?: string;
    timestamp: string;
    runId?: string;
  };
  result: CypressRunResult;
};

function main() {
  const dir = path.resolve("demo/evidence/raw/matrix");
  if (!fs.existsSync(dir)) {
    console.error(
      JSON.stringify({
        ok: false,
        code: "NO_MATRIX_EVIDENCE",
        message: "No matrix evidence yet. Run npm run demo:capture first.",
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

    let envelope: EvidenceEnvelope;
    try {
      envelope = JSON.parse(fs.readFileSync(resultFile, "utf8")) as EvidenceEnvelope;
    } catch {
      return {
        ...row,
        observed: "fail" as const,
        matchedExpectedDefect: false,
        rawError: "Malformed evidence JSON",
      };
    }

    if (!envelope?.meta || !envelope.result || typeof envelope.result !== "object") {
      return {
        ...row,
        observed: "fail" as const,
        matchedExpectedDefect: false,
        rawError: "Evidence missing meta/result envelope",
      };
    }
    if (envelope.meta.scenario !== row.scenario || envelope.meta.variant !== row.variant) {
      return {
        ...row,
        observed: "fail" as const,
        matchedExpectedDefect: false,
        rawError: "Evidence metadata mismatch for scenario/variant",
      };
    }

    if (row.expected === "observation") {
      return {
        ...row,
        observed: "pass" as const,
        matchedExpectedDefect: true,
        note: envelope.result,
      };
    }

    if (row.expected === "pass") {
      const verification = validateCypressRun(envelope.result, { mode: "suite" });
      return {
        ...row,
        observed: verification.ok ? ("pass" as const) : ("fail" as const),
        matchedExpectedDefect: verification.ok,
        rawError: verification.ok ? undefined : verification.reason,
      };
    }

    // Expected business defect
    const failed = (envelope.result.runs || [])
      .flatMap((r) =>
        (r.tests || []).map((t) => ({
          titlePath: t.title || [],
          state: t.state,
          displayError: t.displayError ?? null,
        })),
      )
      .filter((t) => t.state === "failed");

    const ids = row.expectedIds || ["BOOK-001", "BOOK-002", "C-HYBRID"];
    const intended = failed.find((f) =>
      isIntendedBookingStatusDefect({
        titlePath: f.titlePath,
        displayError: f.displayError,
        expectedIds: ids,
      }),
    );

    const matched =
      Boolean(intended) &&
      classifyFailure(intended!.displayError) === row.expected &&
      row.expected === "BOOKING_STATUS_MISMATCH";

    return {
      ...row,
      observed: "fail" as const,
      failureClass: intended ? classifyFailure(intended.displayError) : classifyFailure(failed[0]?.displayError),
      rawError: intended?.displayError || failed[0]?.displayError || "no failed test",
      matchedExpectedDefect: matched,
      preservedFailures: failed,
    };
  });

  const out = path.resolve("demo/evidence/matrix-report.json");
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));

  const bad = report.filter((r) => {
    if (r.expected === "pass" || r.expected === "observation") {
      return r.observed !== "pass";
    }
    return !r.matchedExpectedDefect;
  });

  console.log(JSON.stringify({ ok: bad.length === 0, out, badCount: bad.length, report }, null, 2));
  if (bad.length) process.exit(1);
}

main();
