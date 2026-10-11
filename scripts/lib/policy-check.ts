import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const CRITICAL_ROOTS = [
  "cypress/e2e/critical",
  "cypress/support/critical.ts",
  "cypress/support/common",
  "cypress/contracts",
];

const FORBIDDEN_IMPORT_SNIPPETS = [
  "cypress/e2e/adaptive",
  "cypress/e2e/comparison",
  "cypress/support/adaptive",
  "adaptive-actions",
];

export type PolicyFinding = {
  file: string;
  message: string;
  code: string;
};

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    out.push(...walk(path.join(dir, entry)));
  }
  return out.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
}

function isCommentOrStringOnlyPrompt(sourceFile: ts.SourceFile, node: ts.Node): boolean {
  const text = node.getText(sourceFile);
  return text.includes("cy.prompt") && !ts.isCallExpression(node) && !ts.isPropertyAccessExpression(node);
}

export function analyzeCriticalFile(filePath: string, content: string): PolicyFinding[] {
  const findings: PolicyFinding[] = [];
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (
        ts.isPropertyAccessExpression(expr) &&
        expr.name.text === "prompt" &&
        expr.expression.getText(sourceFile) === "cy"
      ) {
        findings.push({
          file: filePath,
          message: "cy.prompt call is forbidden in critical graph",
          code: "PROMPT_CALL",
        });
      }
      if (
        ts.isElementAccessExpression(expr) &&
        expr.argumentExpression &&
        ts.isStringLiteral(expr.argumentExpression) &&
        expr.argumentExpression.text === "prompt" &&
        expr.expression.getText(sourceFile) === "cy"
      ) {
        findings.push({
          file: filePath,
          message: "Computed cy['prompt'] access is forbidden in critical graph",
          code: "PROMPT_COMPUTED",
        });
      }
      if (
        ts.isIdentifier(expr) &&
        (expr.text === "eval" || expr.text === "Function")
      ) {
        findings.push({
          file: filePath,
          message: `${expr.text} is unsupported in critical graph`,
          code: "DYNAMIC_EVAL",
        });
      }
    }

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const module = node.moduleSpecifier;
      if (module && ts.isStringLiteral(module)) {
        const spec = module.text;
        if (spec.includes("adaptive") || FORBIDDEN_IMPORT_SNIPPETS.some((s) => spec.includes(s))) {
          findings.push({
            file: filePath,
            message: `Forbidden import into critical graph: ${spec}`,
            code: "FORBIDDEN_IMPORT",
          });
        }
        if (spec.startsWith("http:") || spec.includes("data:")) {
          findings.push({
            file: filePath,
            message: `Unsupported dynamic/remote import: ${spec}`,
            code: "DYNAMIC_IMPORT",
          });
        }
      }
    }

    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === "import") {
      findings.push({
        file: filePath,
        message: "Dynamic import() is unsupported in critical graph",
        code: "DYNAMIC_IMPORT",
      });
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const name = node.expression.name.text;
      if (name === "only" || name === "skip") {
        const base = node.expression.expression.getText(sourceFile);
        if (base === "it" || base === "describe" || base === "context") {
          findings.push({
            file: filePath,
            message: `${base}.${name} is forbidden for required suite`,
            code: "FOCUSED_OR_SKIPPED",
          });
        }
      }
    }

    // Ignore comments that merely discuss cy.prompt — only flag executable nodes above.
    void isCommentOrStringOnlyPrompt;

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  // Detect helper-wrapped prompt: function that only forwards to cy.prompt
  if (/function\s+\w+\s*\([^)]*\)\s*\{[^}]*cy\s*\.\s*prompt/m.test(content)) {
    findings.push({
      file: filePath,
      message: "Helper-wrapped cy.prompt detected in critical graph",
      code: "PROMPT_HELPER",
    });
  }

  return findings;
}

export function runPolicyCheck(cwd = process.cwd()): PolicyFinding[] {
  const files = CRITICAL_ROOTS.flatMap((root) => walk(path.join(cwd, root)));
  const findings: PolicyFinding[] = [];
  for (const file of files) {
    // common helpers are shared; still forbid prompt there
    const content = fs.readFileSync(file, "utf8");
    findings.push(...analyzeCriticalFile(path.relative(cwd, file), content));
  }
  return findings;
}
