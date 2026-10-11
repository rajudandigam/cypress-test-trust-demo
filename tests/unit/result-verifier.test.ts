import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  isIntendedBookingStatusDefect,
  loadRequiredManifest,
  validateCypressRun,
} from "../../scripts/lib/cypress-result.js";

const SPEC = "cypress/e2e/critical/booking-contract.cy.ts";
const BOOK001 = [
  "Critical booking contract",
  "BOOK-001 confirms the selected itinerary for the authenticated traveler at the quoted total",
];
const BOOK002 = [
  "Critical booking contract",
  "BOOK-002 the reservation remains correct after direct navigation/refresh of its receipt",
];

function passingRequiredRun() {
  return {
    status: "finished",
    totalFailed: 0,
    totalPassed: 2,
    totalTests: 2,
    runs: [
      {
        spec: { relative: SPEC },
        tests: [
          { title: BOOK001, state: "passed" },
          { title: BOOK002, state: "passed" },
        ],
      },
    ],
  };
}

describe("validateCypressRun required mode", () => {
  const cases = loadRequiredManifest().requiredCases;

  it("passes when exact spec+titlePath cases passed", () => {
    const result = validateCypressRun(passingRequiredRun(), {
      mode: "required",
      requiredCases: cases,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects one passed BOOK-001 BOOK-002 placeholder in wrong spec", () => {
    const result = validateCypressRun(
      {
        status: "finished",
        totalFailed: 0,
        runs: [
          {
            spec: { relative: "cypress/e2e/critical/wrong.cy.ts" },
            tests: [
              {
                title: ["BOOK-001 BOOK-002 placeholder"],
                state: "passed",
              },
            ],
          },
        ],
      },
      { mode: "required", requiredCases: cases },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MISSING_REQUIRED");
  });

  it("fails when both required pass but another critical test failed", () => {
    const result = validateCypressRun(
      {
        status: "finished",
        totalFailed: 1,
        runs: [
          {
            spec: { relative: SPEC },
            tests: [
              { title: BOOK001, state: "passed" },
              { title: BOOK002, state: "passed" },
              { title: ["Critical booking contract", "extra case"], state: "failed" },
            ],
          },
        ],
      },
      { mode: "required", requiredCases: cases },
    );
    expect(result.ok).toBe(false);
  });

  it("fails skipped/pending/missing/malformed/empty", () => {
    expect(validateCypressRun(null, { mode: "required", requiredCases: cases }).ok).toBe(false);
    expect(validateCypressRun({}, { mode: "required", requiredCases: cases }).ok).toBe(false);
    expect(
      validateCypressRun(
        { status: "finished", runs: [] },
        { mode: "required", requiredCases: cases },
      ).ok,
    ).toBe(false);
    expect(
      validateCypressRun(
        {
          runs: [
            {
              spec: { relative: SPEC },
              tests: [
                { title: BOOK001, state: "passed" },
                { title: BOOK002, state: "pending" },
              ],
            },
          ],
        },
        { mode: "required", requiredCases: cases },
      ).ok,
    ).toBe(false);
  });

  it("fails startup-style results with failures and no runs", () => {
    const result = validateCypressRun(
      { failures: 1, message: "Could not find Cypress test run results" },
      { mode: "required", requiredCases: cases },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RUN_ERROR");
  });
});

describe("validateCypressRun suite mode (adaptive/hybrid)", () => {
  it("fails a completed run with totalFailed=1", () => {
    const result = validateCypressRun(
      {
        status: "finished",
        totalFailed: 1,
        totalPassed: 0,
        runs: [
          {
            spec: { relative: "cypress/e2e/adaptive/booking-shallow.cy.ts" },
            tests: [{ title: ["A"], state: "failed", displayError: "AssertionError" }],
          },
        ],
      },
      { mode: "suite" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SUITE_FAILED");
  });

  it("rejects empty object as pass", () => {
    expect(validateCypressRun({}, { mode: "suite" }).ok).toBe(false);
  });
});

describe("failure classification", () => {
  it("detects booking status mismatch only for assertion failures", () => {
    expect(
      classifyFailure(
        "AssertionError: BOOKING_STATUS_MISMATCH: persisted reservation must be confirmed: expected 'pending' to equal 'confirmed'",
      ),
    ).toBe("BOOKING_STATUS_MISMATCH");
    expect(
      classifyFailure(
        "Timed out retrying after 4000ms: Expected to find element while checking BOOKING_STATUS_MISMATCH",
      ),
    ).toBe("SETUP_FAILURE");
    expect(
      isIntendedBookingStatusDefect({
        titlePath: BOOK001,
        displayError:
          "AssertionError: BOOKING_STATUS_MISMATCH: expected 'pending' to equal 'confirmed'",
        expectedIds: ["BOOK-001", "BOOK-002"],
      }),
    ).toBe(true);
    expect(
      isIntendedBookingStatusDefect({
        titlePath: ["unrelated case"],
        displayError:
          "AssertionError: BOOKING_STATUS_MISMATCH: expected 'pending' to equal 'confirmed'",
        expectedIds: ["BOOK-001", "BOOK-002"],
      }),
    ).toBe(false);
  });
});
