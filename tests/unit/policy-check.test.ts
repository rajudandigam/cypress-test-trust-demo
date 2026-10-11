import { describe, expect, it } from "vitest";
import { analyzeCriticalFile } from "../../scripts/lib/policy-check.js";

describe("policy-check", () => {
  it("flags direct cy.prompt", () => {
    const findings = analyzeCriticalFile(
      "cypress/e2e/critical/bad.cy.ts",
      `it('x', () => { cy.prompt(['click']) })`,
    );
    expect(findings.some((f) => f.code === "PROMPT_CALL")).toBe(true);
  });

  it("flags computed prompt access", () => {
    const findings = analyzeCriticalFile(
      "cypress/e2e/critical/bad.cy.ts",
      `it('x', () => { cy['prompt'](['click']) })`,
    );
    expect(findings.some((f) => f.code === "PROMPT_COMPUTED")).toBe(true);
  });

  it("does not flag comments discussing cy.prompt", () => {
    const findings = analyzeCriticalFile(
      "cypress/e2e/critical/ok.cy.ts",
      `// This suite must never call cy.prompt\nit('BOOK-001', () => { cy.get('body') })`,
    );
    expect(findings.filter((f) => f.code.startsWith("PROMPT"))).toHaveLength(0);
  });

  it("flags .only and adaptive imports", () => {
    const findings = analyzeCriticalFile(
      "cypress/e2e/critical/bad.cy.ts",
      `import '../adaptive/x'\nit.only('BOOK-001', () => {})`,
    );
    expect(findings.some((f) => f.code === "FOCUSED_OR_SKIPPED")).toBe(true);
    expect(findings.some((f) => f.code === "FORBIDDEN_IMPORT")).toBe(true);
  });
});
