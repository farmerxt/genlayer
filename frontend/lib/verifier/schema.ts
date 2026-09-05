/**
 * Validation of VerificationResult objects — mirrors the on-chain schema.
 * Used by tests and by the API before persisting results.
 */

import type { VerificationResult } from "@/lib/types";

export function validateResultSchema(result: unknown): asserts result is VerificationResult {
  if (typeof result !== "object" || result === null) {
    throw new Error("Result must be an object");
  }
  const r = result as Record<string, unknown>;

  if (r.decision !== "PASS" && r.decision !== "FAIL") {
    throw new Error("decision must be PASS or FAIL");
  }
  if (typeof r.score !== "number" || r.score < 0 || r.score > 1) {
    throw new Error("score must be a number in [0,1]");
  }
  if (!Array.isArray(r.requirements) || r.requirements.length === 0) {
    throw new Error("requirements must be a non-empty array");
  }
  for (const req of r.requirements as Array<Record<string, unknown>>) {
    if (!req.id || !req.requirement) throw new Error("requirement missing id/text");
    if (req.status !== "PASS" && req.status !== "FAIL") {
      throw new Error(`requirement ${req.id} status must be PASS or FAIL`);
    }
    if (req.checkedBy !== "deterministic" && req.checkedBy !== "llm") {
      throw new Error(`requirement ${req.id} checkedBy invalid`);
    }
    if (typeof req.reason !== "string" || !req.reason) {
      throw new Error(`requirement ${req.id} missing reason`);
    }
  }
  if (!Array.isArray(r.evidence)) throw new Error("evidence must be an array");
  for (const ev of r.evidence as Array<Record<string, unknown>>) {
    if (!ev.source || !ev.claim) throw new Error("evidence missing source/claim");
    if (typeof ev.used !== "boolean" || typeof ev.fetched !== "boolean") {
      throw new Error("evidence used/fetched must be booleans");
    }
  }
  if (typeof r.summary !== "string") throw new Error("summary must be a string");
  if (r.verificationVersion !== "1.0") {
    throw new Error("verificationVersion must be 1.0");
  }
}

export function isPassResult(result: VerificationResult): boolean {
  return result.decision === "PASS";
}