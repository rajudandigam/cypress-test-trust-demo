import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeCriticalFile, collectCriticalGraph } from "../../scripts/lib/policy-check.js";

describe("analyzeCriticalFile", () => {
  it("flags direct and computed cy.prompt", () => {
    expect(
      analyzeCriticalFile("cypress/e2e/critical/bad.cy.ts", `it('x', () => { cy.prompt(['click']) })`).some(
        (f) => f.code === "PROMPT_CALL",
      ),
    ).toBe(true);
    expect(
      analyzeCriticalFile(
        "cypress/e2e/critical/bad.cy.ts",
        `it('x', () => { cy['prompt'](['click']) })`,
      ).some((f) => f.code === "PROMPT_COMPUTED"),
    ).toBe(true);
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

describe("collectCriticalGraph", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it("fails when a critical spec imports an outside helper that calls cy.prompt", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cttd-policy-"));
    dirs.push(root);
    const layout = [
      "cypress/e2e/critical",
      "cypress/support/common",
      "cypress/contracts",
      "cypress/support",
      "shared",
    ];
    for (const d of layout) fs.mkdirSync(path.join(root, d), { recursive: true });

    fs.writeFileSync(
      path.join(root, "cypress/support/critical.ts"),
      `import './common/commands'\n`,
    );
    fs.writeFileSync(path.join(root, "cypress/support/common/commands.ts"), `export {}\n`);
    fs.writeFileSync(
      path.join(root, "cypress/e2e/critical/booking-contract.cy.ts"),
      `import '../../../shared/booking'\nit('BOOK-001', () => {})\n`,
    );
    fs.writeFileSync(
      path.join(root, "shared/booking.ts"),
      `export function go() { cy.prompt(['click']) }\n`,
    );

    const { findings } = collectCriticalGraph(root);
    expect(findings.some((f) => f.code === "BOUNDARY_ESCAPE" || f.code === "PROMPT_CALL")).toBe(
      true,
    );
  });

  it("fails a re-export chain that escapes the boundary", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cttd-policy-re-"));
    dirs.push(root);
    for (const d of [
      "cypress/e2e/critical",
      "cypress/support/common",
      "cypress/contracts",
      "cypress/support",
      "outside",
    ]) {
      fs.mkdirSync(path.join(root, d), { recursive: true });
    }
    fs.writeFileSync(path.join(root, "cypress/support/critical.ts"), `export {}\n`);
    fs.writeFileSync(
      path.join(root, "cypress/support/common/bridge.ts"),
      `export { sneak } from '../../../outside/sneak'\n`,
    );
    // bridge is under common — allowed — but re-exports outside
    fs.writeFileSync(
      path.join(root, "outside/sneak.ts"),
      `export function sneak() { cy.prompt(['x']) }\n`,
    );
    fs.writeFileSync(
      path.join(root, "cypress/e2e/critical/booking-contract.cy.ts"),
      `import '../../support/common/bridge'\nit('x', () => {})\n`,
    );

    const { findings } = collectCriticalGraph(root);
    expect(findings.some((f) => f.code === "BOUNDARY_ESCAPE" || f.code === "PROMPT_CALL")).toBe(
      true,
    );
  });
});
