/**
 * Compatibility re-exports. Prefer scripts/lib/cypress-result.ts for new code.
 */
export {
  validateCypressRun,
  loadRequiredManifest,
  classifyFailure,
  matchesExpectedDefect,
  isIntendedBookingStatusDefect,
  type CypressRunResult,
  type ValidationResult,
  type FailureClass,
  type RequiredCase,
} from "./cypress-result.js";

import {
  loadRequiredManifest,
  validateCypressRun,
  type CypressRunResult,
  type ValidationResult,
} from "./cypress-result.js";

/** @deprecated Prefer validateCypressRun with requiredCases from the manifest. */
export function verifyRequiredResults(
  run: CypressRunResult | null | undefined,
): ValidationResult {
  const manifest = loadRequiredManifest();
  return validateCypressRun(run, { mode: "required", requiredCases: manifest.requiredCases });
}
