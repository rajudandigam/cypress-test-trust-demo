import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  matchesExpectedDefect,
  verifyRequiredResults,
} from "../../scripts/lib/result-verifier.js";

describe("verifyRequiredResults", () => {
  it("passes when required identities passed", () => {
    const result = verifyRequiredResults({
      status: "finished",
      runs: [
        {
          tests: [
            { title: ["Critical", "BOOK-001 confirms"], state: "passed" },
            { title: ["Critical", "BOOK-002 refresh"], state: "passed" },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("fails when a required identity is missing", () => {
    const result = verifyRequiredResults({
      runs: [{ tests: [{ title: ["BOOK-001 confirms"], state: "passed" }] }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MISSING_REQUIRED");
  });

  it("fails when a required identity is skipped", () => {
    const result = verifyRequiredResults({
      runs: [
        {
          tests: [
            { title: ["BOOK-001"], state: "passed" },
            { title: ["BOOK-002"], state: "pending" },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SKIPPED_REQUIRED");
  });

  it("fails when a required identity failed", () => {
    const result = verifyRequiredResults({
      runs: [
        {
          tests: [
            { title: ["BOOK-001"], state: "failed" },
            { title: ["BOOK-002"], state: "passed" },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FAILED_REQUIRED");
  });

  it("fails on malformed/no-result", () => {
    expect(verifyRequiredResults(null).ok).toBe(false);
    expect(verifyRequiredResults({ runs: [] }).ok).toBe(false);
  });
});

describe("failure classification", () => {
  it("detects booking status mismatch distinctly from setup failures", () => {
    expect(classifyFailure("BOOKING_STATUS_MISMATCH: persisted reservation must be confirmed")).toBe(
      "BOOKING_STATUS_MISMATCH",
    );
    expect(
      matchesExpectedDefect(
        "BOOKING_STATUS_MISMATCH: persisted reservation must be confirmed",
        "BOOKING_STATUS_MISMATCH",
      ),
    ).toBe(true);
    expect(classifyFailure("Timed out retrying after 4000ms: Expected to find element")).toBe(
      "SETUP_FAILURE",
    );
    expect(
      matchesExpectedDefect("Timed out retrying after 4000ms: Expected to find element", "BOOKING_STATUS_MISMATCH"),
    ).toBe(false);
  });
});
