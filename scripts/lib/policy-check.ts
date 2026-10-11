import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ALLOWED_PREFIXES = [
  "cypress/e2e/critical/",
  "cypress/support/critical.ts",
  "cypress/support/common/",
  "cypress/contracts/",
];

const ENTRY_POINTS = [
  "cypress/e2e/critical/booking-contract.cy.ts",
  "cypress/support/critical.ts",
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

function isAllowedPath(rel: string): boolean {
  const n = rel.replace(/\\/g, "/");
  return ALLOWED_PREFIXES.some((p) => n === p || n.startsWith(p));
}

function resolveImport(
  fromFile: string,
  specifier: string,
  cwd: string,
): string | "external" | "alias-rejected" | "unresolved" {
  if (
    specifier.startsWith("http:") ||
    specifier.startsWith("https:") ||
    specifier.startsWith("data:")
  ) {
    return "unresolved";
  }
  if (specifier.startsWith("@") || (!specifier.startsWith(".") && !specifier.startsWith("/"))) {
    // No path aliases are permitted in the critical graph
    if (specifier.startsWith("@")) return "alias-rejected";
    return "external";
  }
  const fromDir = path.dirname(path.join(cwd, fromFile));
  const candidates = [
    path.resolve(fromDir, specifier),
    path.resolve(fromDir, `${specifier}.ts`),
    path.resolve(fromDir, `${specifier}.tsx`),
    path.resolve(fromDir, specifier, "index.ts"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return path.relative(cwd, c).replace(/\\/g, "/");
    }
  }
  return "unresolved";
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
      if (ts.isIdentifier(expr) && (expr.text === "eval" || expr.text === "Function")) {
        findings.push({
          file: filePath,
          message: `${expr.text} is unsupported in critical graph`,
          code: "DYNAMIC_EVAL",
        });
      }
      if (ts.isPropertyAccessExpression(expr)) {
        const name = expr.name.text;
        if (name === "only" || name === "skip") {
          const base = expr.expression.getText(sourceFile);
          if (base === "it" || base === "describe" || base === "context") {
            findings.push({
              file: filePath,
              message: `${base}.${name} is forbidden for required suite`,
              code: "FOCUSED_OR_SKIPPED",
            });
          }
        }
      }
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      findings.push({
        file: filePath,
        message: "Dynamic import() is unsupported in critical graph",
        code: "DYNAMIC_IMPORT",
      });
    }

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const module = node.moduleSpecifier;
      if (module && ts.isStringLiteral(module)) {
        const spec = module.text;
        if (FORBIDDEN_IMPORT_SNIPPETS.some((s) => spec.includes(s)) || spec.includes("adaptive")) {
          findings.push({
            file: filePath,
            message: `Forbidden import into critical graph: ${spec}`,
            code: "FORBIDDEN_IMPORT",
          });
        }
      }
    }

    // Helper that forwards to cy.prompt (executable FunctionDeclaration only)
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      const body = node.body?.getText(sourceFile) || "";
      if (/\bcy\s*\.\s*prompt\s*\(/.test(body) || /\bcy\s*\[\s*['"]prompt['"]\s*\]/.test(body)) {
        findings.push({
          file: filePath,
          message: "Helper-wrapped cy.prompt detected in critical graph",
          code: "PROMPT_HELPER",
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings;
}

export function collectCriticalGraph(cwd = process.cwd()): {
  files: string[];
  findings: PolicyFinding[];
} {
  const findings: PolicyFinding[] = [];
  const visited = new Set<string>();
  const queue = [...ENTRY_POINTS];

  while (queue.length) {
    const rel = queue.pop()!.replace(/\\/g, "/");
    if (visited.has(rel)) continue;
    visited.add(rel);

    if (!isAllowedPath(rel)) {
      findings.push({
        file: rel,
        message: `Critical import graph escaped allowed boundary: ${rel}`,
        code: "BOUNDARY_ESCAPE",
      });
      continue;
    }

    const abs = path.join(cwd, rel);
    if (!fs.existsSync(abs)) {
      findings.push({
        file: rel,
        message: `Missing critical graph file: ${rel}`,
        code: "MISSING_FILE",
      });
      continue;
    }

    const content = fs.readFileSync(abs, "utf8");
    findings.push(...analyzeCriticalFile(rel, content));

    const sourceFile = ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true);
    const consider = (specifier: string) => {
      const resolved = resolveImport(rel, specifier, cwd);
      if (resolved === "external") return;
      if (resolved === "alias-rejected") {
        findings.push({
          file: rel,
          message: `Unsupported path alias in critical graph: ${specifier}`,
          code: "ALIAS_REJECTED",
        });
        return;
      }
      if (resolved === "unresolved") {
        if (specifier.startsWith(".")) {
          findings.push({
            file: rel,
            message: `Unresolved first-party import: ${specifier}`,
            code: "UNRESOLVED_IMPORT",
          });
        }
        return;
      }
      queue.push(resolved);
    };

    const walkImports = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        consider(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, walkImports);
    };
    walkImports(sourceFile);
  }

  return { files: [...visited], findings };
}

export function runPolicyCheck(cwd = process.cwd()): PolicyFinding[] {
  return collectCriticalGraph(cwd).findings;
}
