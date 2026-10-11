import { REQUIRED_TEST_IDENTITIES } from "../../cypress/contracts/booking-contract.js";

export type CypressRunLike = {
  status?: string;
  message?: string;
  totals?: {
    tests?: number;
    passed?: number;
    failed?: number;
    pending?: number;
    skipped?: number;
  };
  runs?: Array<{
    spec?: { relative?: string };
    tests?: Array<{
      title?: string[];
      state?: string;
      displayError?: string | null;
    }>;
    error?: string | null;
  }>;
};

export type VerifyResult =
  | { ok: true; identities: string[] }
  | { ok: false; reason: string; code: string };

function collectTitles(run: CypressRunLike): Array<{ title: string; state: string }> {
  const out: Array<{ title: string; state: string }> = [];
  for (const r of run.runs || []) {
    for (const t of r.tests || []) {
      const title = (t.title || []).join(" ");
      out.push({ title, state: t.state || "unknown" });
    }
  }
  return out;
}

export function verifyRequiredResults(
  run: CypressRunLike | null | undefined,
  requiredIdentities: readonly string[] = REQUIRED_TEST_IDENTITIES,
): VerifyResult {
  if (!run || typeof run !== "object") {
    return { ok: false, reason: "Missing or malformed Cypress run result", code: "NO_RESULT" };
  }
  const failures = (run as { failures?: number; message?: string }).failures;
  if (typeof failures === "number" && failures > 0 && (!run.runs || run.runs.length === 0)) {
    return {
      ok: false,
      reason: run.message || "Could not find Cypress test run results",
      code: "RUN_ERROR",
    };
  }
  if (run.status === "failed" && (!run.runs || run.runs.length === 0)) {
    return {
      ok: false,
      reason: run.message || "Cypress run failed before producing results",
      code: "RUN_ERROR",
    };
  }
  if (!run.runs || run.runs.length === 0) {
    return { ok: false, reason: "No specs executed", code: "EMPTY_RUN" };
  }
  for (const r of run.runs) {
    if (r.error) {
      return { ok: false, reason: `Spec load/run error: ${r.error}`, code: "SPEC_ERROR" };
    }
  }

  const tests = collectTitles(run);
  if (tests.length === 0) {
    return { ok: false, reason: "Zero tests discovered", code: "NO_TESTS" };
  }

  const found: string[] = [];
  for (const identity of requiredIdentities) {
    const match = tests.find((t) => t.title.includes(identity));
    if (!match) {
      return {
        ok: false,
        reason: `Missing required test identity ${identity}`,
        code: "MISSING_REQUIRED",
      };
    }
    if (match.state === "pending" || match.state === "skipped") {
      return {
        ok: false,
        reason: `Required test ${identity} was ${match.state}`,
        code: "SKIPPED_REQUIRED",
      };
    }
    if (match.state !== "passed") {
      return {
        ok: false,
        reason: `Required test ${identity} state=${match.state}`,
        code: "FAILED_REQUIRED",
      };
    }
    found.push(identity);
  }

  return { ok: true, identities: found };
}

export type FailureClass =
  | "BOOKING_STATUS_MISMATCH"
  | "LOCATOR_FAILURE"
  | "SETUP_FAILURE"
  | "OTHER_ASSERTION"
  | "UNKNOWN";

export function classifyFailure(message: string | null | undefined): FailureClass {
  const text = message || "";
  if (text.includes("BOOKING_STATUS_MISMATCH")) return "BOOKING_STATUS_MISMATCH";
  if (
    /Timed out retrying|Expected to find element|could not find|CypressError|browser/i.test(text)
  ) {
    if (/data-cy|selector|select-button|not found/i.test(text)) return "LOCATOR_FAILURE";
    return "SETUP_FAILURE";
  }
  if (/AssertionError/i.test(text)) return "OTHER_ASSERTION";
  return "UNKNOWN";
}

export function matchesExpectedDefect(
  message: string | null | undefined,
  expected: FailureClass,
): boolean {
  return classifyFailure(message) === expected;
}
