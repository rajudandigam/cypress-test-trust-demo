import fs from "node:fs";
import path from "node:path";

export type RequiredCase = {
  id: string;
  spec: string;
  titlePath: string[];
};

export type RequiredManifest = {
  version: number;
  requiredCases: RequiredCase[];
};

export type CypressTestResult = {
  title?: string[];
  state?: string;
  displayError?: string | null;
};

export type CypressSpecRun = {
  spec?: { relative?: string; name?: string };
  tests?: CypressTestResult[];
  error?: string | null;
};

/** Shape compatible with Cypress Module API cypress.run() results. */
export type CypressRunResult = {
  status?: string;
  message?: string;
  failures?: number;
  totalFailed?: number;
  totalPassed?: number;
  totalPending?: number;
  totalSkipped?: number;
  totalTests?: number;
  runs?: CypressSpecRun[];
};

export type ValidationOk = { ok: true; matchedIds: string[] };
export type ValidationFail = { ok: false; reason: string; code: string };
export type ValidationResult = ValidationOk | ValidationFail;

export function loadRequiredManifest(
  manifestPath = path.resolve("scripts/required-manifest.json"),
): RequiredManifest {
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as RequiredManifest;
  if (!raw?.requiredCases?.length) {
    throw new Error(`Invalid required manifest at ${manifestPath}`);
  }
  return raw;
}

function normalizeSpec(relative: string | undefined): string {
  if (!relative) return "";
  return relative.replace(/\\/g, "/");
}

function titleKey(titlePath: string[]): string {
  return titlePath.join("\0");
}

function collectExecuted(
  run: CypressRunResult,
): Array<{ spec: string; titlePath: string[]; state: string; displayError: string | null }> {
  const out: Array<{
    spec: string;
    titlePath: string[];
    state: string;
    displayError: string | null;
  }> = [];
  for (const r of run.runs || []) {
    const spec = normalizeSpec(r.spec?.relative || r.spec?.name);
    for (const t of r.tests || []) {
      out.push({
        spec,
        titlePath: t.title || [],
        state: t.state || "unknown",
        displayError: t.displayError ?? null,
      });
    }
  }
  return out;
}

/**
 * Validate a Cypress Module API run result.
 * A resolved promise is not success — inspect totals and per-test state.
 */
export function validateCypressRun(
  run: CypressRunResult | null | undefined,
  options: {
    mode: "required" | "suite";
    requiredCases?: RequiredCase[];
  },
): ValidationResult {
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return { ok: false, reason: "Missing or malformed Cypress run result", code: "NO_RESULT" };
  }

  if (
    run.runs === undefined &&
    run.totalFailed === undefined &&
    run.failures === undefined &&
    run.status === undefined
  ) {
    return { ok: false, reason: "Incomplete Cypress result object", code: "MALFORMED_RESULT" };
  }

  if (typeof run.failures === "number" && run.failures > 0 && (!run.runs || run.runs.length === 0)) {
    return {
      ok: false,
      reason: run.message || "Cypress failed to start or produce results",
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

  const executed = collectExecuted(run);
  if (executed.length === 0) {
    return { ok: false, reason: "Zero tests discovered", code: "NO_TESTS" };
  }

  if (executed.every((t) => t.state === "pending" || t.state === "skipped")) {
    return { ok: false, reason: "All tests pending/skipped", code: "ALL_PENDING" };
  }

  const failedCount = executed.filter((t) => t.state === "failed").length;
  const totalFailed =
    typeof run.totalFailed === "number" ? run.totalFailed : failedCount;

  if (options.mode === "suite") {
    if (totalFailed > 0 || failedCount > 0) {
      return {
        ok: false,
        reason: `Suite reported totalFailed=${totalFailed}`,
        code: "SUITE_FAILED",
      };
    }
    const bad = executed.find((t) => t.state !== "passed");
    if (bad) {
      return {
        ok: false,
        reason: `Non-passing test ${bad.titlePath.join(" ")} state=${bad.state}`,
        code: "SUITE_FAILED",
      };
    }
    return { ok: true, matchedIds: executed.map((t) => t.titlePath.join(" / ")) };
  }

  const required = options.requiredCases || [];
  if (!required.length) {
    return { ok: false, reason: "No required cases provided", code: "NO_MANIFEST" };
  }

  const matchedIds: string[] = [];

  for (const expected of required) {
    const wantKey = titleKey(expected.titlePath);
    const matches = executed.filter(
      (t) =>
        normalizeSpec(t.spec) === normalizeSpec(expected.spec) &&
        titleKey(t.titlePath) === wantKey,
    );
    if (matches.length === 0) {
      return {
        ok: false,
        reason: `Missing required case ${expected.id} in ${expected.spec}`,
        code: "MISSING_REQUIRED",
      };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        reason: `Duplicate results for required case ${expected.id}`,
        code: "DUPLICATE_REQUIRED",
      };
    }
    const match = matches[0];
    if (match.state === "pending" || match.state === "skipped") {
      return {
        ok: false,
        reason: `Required case ${expected.id} was ${match.state}`,
        code: "SKIPPED_REQUIRED",
      };
    }
    if (match.state !== "passed") {
      return {
        ok: false,
        reason: `Required case ${expected.id} state=${match.state}`,
        code: "FAILED_REQUIRED",
      };
    }
    matchedIds.push(expected.id);
  }

  const requiredSpecs = new Set(required.map((c) => normalizeSpec(c.spec)));
  const requiredKeys = new Set(
    required.map((c) => `${normalizeSpec(c.spec)}\0${titleKey(c.titlePath)}`),
  );

  for (const t of executed) {
    if (!requiredSpecs.has(normalizeSpec(t.spec))) continue;
    const key = `${normalizeSpec(t.spec)}\0${titleKey(t.titlePath)}`;
    if (!requiredKeys.has(key) && t.state === "failed") {
      return {
        ok: false,
        reason: `Unexpected failed test in required suite: ${t.titlePath.join(" ")}`,
        code: "UNEXPECTED_SUITE_FAILURE",
      };
    }
    if (requiredKeys.has(key) && (t.state === "pending" || t.state === "skipped")) {
      return {
        ok: false,
        reason: `Required test pending/skipped: ${t.titlePath.join(" ")}`,
        code: "SKIPPED_REQUIRED",
      };
    }
  }

  if (totalFailed > 0) {
    return {
      ok: false,
      reason: `Required suite totalFailed=${totalFailed}`,
      code: "SUITE_FAILED",
    };
  }

  return { ok: true, matchedIds };
}

export type FailureClass =
  | "BOOKING_STATUS_MISMATCH"
  | "LOCATOR_FAILURE"
  | "SETUP_FAILURE"
  | "OTHER_ASSERTION"
  | "UNKNOWN";

export function classifyFailure(message: string | null | undefined): FailureClass {
  const text = message || "";
  // Setup/locator failures win even if the message happens to mention the defect token
  if (
    /Timed out retrying|Expected to find element|could not find element|CypressError|browser was not/i.test(
      text,
    )
  ) {
    if (/data-cy|selector|select-button|not found/i.test(text)) return "LOCATOR_FAILURE";
    return "SETUP_FAILURE";
  }
  if (
    text.includes("BOOKING_STATUS_MISMATCH") &&
    /AssertionError|expected ['"].*['"] to (?:eq|equal)/i.test(text)
  ) {
    return "BOOKING_STATUS_MISMATCH";
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

/** Defect match requires the failed test to be an expected identity and the assertion class. */
export function isIntendedBookingStatusDefect(failed: {
  titlePath: string[];
  displayError: string | null;
  expectedIds: string[];
}): boolean {
  const title = failed.titlePath.join(" ");
  const isExpectedCase = failed.expectedIds.some((id) => {
    const re = new RegExp(`\\b${id}\\b`);
    return re.test(title);
  });
  if (!isExpectedCase) return false;
  return classifyFailure(failed.displayError) === "BOOKING_STATUS_MISMATCH";
}
