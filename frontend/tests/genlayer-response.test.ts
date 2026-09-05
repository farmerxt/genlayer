import { describe, expect, it } from "vitest";
import { normalizeOnChainResult } from "@/lib/genlayer/verifier";
import { validateResultSchema } from "@/lib/verifier/schema";

const ON_CHAIN_RESULT = {
  verification_id: "v-123",
  verification_version: "1.0",
  decision: "FAIL",
  score: 0.8333,
  requirements: [
    {
      id: "REQ-1",
      requirement: "Password reset request can be submitted.",
      status: "PASS",
      checked_by: "deterministic",
      reason: "Required content found in submitted deliverable.",
      check: { type: "string_present", needle: "request_password_reset" },
    },
    {
      id: "REQ-6",
      requirement: "Invalid or expired tokens are rejected.",
      status: "FAIL",
      checked_by: "deterministic",
      reason: "Verifier-supplied evidence shows requirement not met.",
    },
  ],
  evidence: [
    { source: "fixture test suite", claim: "exit 1", used: true, fetched: false },
  ],
  summary: "5 of 6 requirements satisfied. Decision: FAIL.",
  consensus: { method: "equivalence_principle", principle: "strict_eq", judge: "genlayer_llm" },
};

describe("genlayer on-chain response parsing", () => {
  it("normalizes snake_case result into the app shape", () => {
    const result = normalizeOnChainResult(ON_CHAIN_RESULT, "v-123");
    expect(result.verificationId).toBe("v-123");
    expect(result.decision).toBe("FAIL");
    expect(result.score).toBe(0.8333);
    expect(result.requirements[0].checkedBy).toBe("deterministic");
    expect(result.requirements[1].status).toBe("FAIL");
    expect(result.evidence[0].used).toBe(true);
    expect(() => validateResultSchema(result)).not.toThrow();
  });

  it("tolerates missing optional fields", () => {
    const result = normalizeOnChainResult(
      { decision: "PASS", score: 1, requirements: [], evidence: [], summary: "s" },
      "v-2",
    );
    expect(result.decision).toBe("PASS");
    expect(result.requirements).toEqual([]);
  });

  it("normalizes a PASS decision", () => {
    const result = normalizeOnChainResult({ ...ON_CHAIN_RESULT, decision: "PASS" }, "v-3");
    expect(result.decision).toBe("PASS");
  });

  it("marks mode as genlayer with consensus metadata", () => {
    const result = normalizeOnChainResult(ON_CHAIN_RESULT, "v-4");
    expect(result.mode).toBe("genlayer");
    expect(result.consensus.principle).toBe("strict_eq");
    expect(result.consensus.judge).toBe("genlayer_llm");
  });
});