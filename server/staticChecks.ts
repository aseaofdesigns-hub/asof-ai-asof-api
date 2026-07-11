import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

// @babel/traverse's CJS/ESM interop is inconsistent across bundlers — some
// wrap the function in a `.default`, some don't. Handle both so this doesn't
// silently break in whichever direction the production esbuild bundle picks.
const traverse: typeof _traverse =
  typeof _traverse === "function" ? _traverse : (_traverse as any).default;

export interface StaticFinding {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  line: number;
  source: "static_analysis";
}

// Deterministic AST checks that run before the LLM call. Deliberately a
// short, low-false-positive list — false positives are worse than missed
// findings here, since these get labeled "confirmed by static analysis"
// rather than "the AI thinks so." Any expansion of this list should ship
// with known-good/known-bad fixtures per check.
export function runStaticChecks(code: string): StaticFinding[] {
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      errorRecovery: true,
      plugins: ["typescript", "jsx"],
    });
  } catch {
    // Unparseable input (a fragment, or a non-JS/TS language pasted in).
    // Fail silently — the LLM path still runs normally.
    return [];
  }

  const findings: StaticFinding[] = [];

  traverse(ast, {
    // 1. Unguarded property access immediately after Array.prototype.find()
    //    e.g. `arr.find(x => x.id === id).name` with no null check.
    //    Deliberately excludes .get() — Express req.get(), URLSearchParams,
    //    and Headers all share that method name but aren't nullable the
    //    same way Map.get() is, and were producing false positives.
    CallExpression(path) {
      const callee = path.node.callee;
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.property) &&
        callee.property.name === "find" &&
        t.isMemberExpression(path.parent) &&
        path.parent.object === path.node
      ) {
        findings.push({
          id: "unguarded-optional-access",
          severity: "critical",
          message: "Result of .find() is accessed without a null/undefined check",
          line: path.node.loc?.start.line ?? 0,
          source: "static_analysis",
        });
      }
    },

    // 2. Empty catch block (swallowed error, no logging, no rethrow)
    CatchClause(path) {
      if (path.node.body.body.length === 0) {
        findings.push({
          id: "empty-catch-block",
          severity: "warning",
          message: "Catch block silently swallows the error",
          line: path.node.loc?.start.line ?? 0,
          source: "static_analysis",
        });
      }
    },

    // 3. Async-looking call with no await, no .then, no .catch
    //    (fire-and-forget promise — common source of unhandled rejections).
    //    Name-heuristic only, so it's the lowest-confidence check here —
    //    kept as "warning" and excluded from the score floor in step 1.
    ExpressionStatement(path) {
      const expr = path.node.expression;
      if (t.isCallExpression(expr) && isLikelyAsyncCall(expr)) {
        findings.push({
          id: "unhandled-promise",
          severity: "warning",
          message: "Async call is not awaited and has no .catch() — rejection would be unhandled",
          line: path.node.loc?.start.line ?? 0,
          source: "static_analysis",
        });
      }
    },

    // 4. Use of eval() — flag outright regardless of context
    Identifier(path) {
      if (
        path.node.name === "eval" &&
        t.isCallExpression(path.parent) &&
        path.parent.callee === path.node
      ) {
        findings.push({
          id: "eval-usage",
          severity: "critical",
          message: "eval() executes arbitrary strings as code — high injection risk",
          line: path.node.loc?.start.line ?? 0,
          source: "static_analysis",
        });
      }
    },

    // 5. Unreachable code directly after return/throw in the same block
    ReturnStatement(path) {
      flagUnreachableAfter(path, findings);
    },
    ThrowStatement(path) {
      flagUnreachableAfter(path, findings);
    },
  });

  return findings;
}

function isLikelyAsyncCall(expr: t.CallExpression): boolean {
  // Heuristic only: calls named like fetch/save/send/query/update etc.
  // without await. Deliberately conservative to keep false positives low —
  // better to miss some than to cry wolf on every function call.
  const callee = expr.callee;
  const name = t.isIdentifier(callee)
    ? callee.name
    : t.isMemberExpression(callee) && t.isIdentifier(callee.property)
    ? callee.property.name
    : "";
  return /^(fetch|save|send|query|update|delete|create|post|put)/i.test(name);
}

function flagUnreachableAfter(
  path: { parentPath: { node: t.Node } | null; node: t.Node },
  findings: StaticFinding[]
) {
  const parentNode = path.parentPath?.node;
  if (!parentNode) return;
  const siblings = (parentNode as any).body;
  if (!Array.isArray(siblings)) return;
  const idx = siblings.indexOf(path.node);
  if (idx !== -1 && idx < siblings.length - 1) {
    findings.push({
      id: "unreachable-code",
      severity: "info",
      message: "Code after this statement is unreachable",
      line: siblings[idx + 1].loc?.start.line ?? 0,
      source: "static_analysis",
    });
  }
}
