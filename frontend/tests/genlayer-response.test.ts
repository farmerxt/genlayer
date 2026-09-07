import { describe, expect, it, vi } from "vitest";
import {
  GenLayerCapacityError,
  getGenLayerCapacityRetryDelay,
  hasTransactionHash,
  isGenLayerCapacityError,
  MAX_GENLAYER_WRITE_ATTEMPTS,
  normalizeOnChainResult,
  writeContractWithCapacityRetry,
} from "@/lib/genlayer/verifier";
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
  consensus: {
    method: "equivalence_principle",
    principle: "run_nondet_unsafe",
    judge: "genlayer_llm",
    web_evidence: "strict_eq",
    llm_adjudication: "leader_fn_validator_fn",
  },
};

function capacityError(retryAfterMs?: number): Error {
  return Object.assign(
    new Error("transaction gas rate limit exceeded: node is at capacity"),
    { code: -32005, retryAfterMs },
  );
}

describe("genlayer capacity error handling", () => {
  it("recognizes the exact Bradbury -32005 capacity error", () => {
    expect(
      isGenLayerCapacityError(
        capacityError(216),
      ),
    ).toBe(true);
    expect(
      isGenLayerCapacityError(
        Object.assign(new Error("transaction gas rate limit exceeded: node is at capacity"), { code: -32004 }),
      ),
    ).toBe(false);
  });

  it("does not classify generic errors or timeouts as capacity", () => {
    expect(isGenLayerCapacityError(new Error("insufficient funds"))).toBe(false);
    expect(isGenLayerCapacityError(new Error("transaction reverted"))).toBe(false);
    expect(isGenLayerCapacityError(new Error("request timed out"))).toBe(false);
    expect(isGenLayerCapacityError(Object.assign(new Error("node is at capacity"), { code: -32005 }))).toBe(false);
  });

  it("clamps retryAfterMs to 100–1000ms", () => {
    expect(getGenLayerCapacityRetryDelay(capacityError(1))).toBe(100);
    expect(getGenLayerCapacityRetryDelay(capacityError(216))).toBe(216);
    expect(getGenLayerCapacityRetryDelay(capacityError(5_000))).toBe(1_000);
    expect(getGenLayerCapacityRetryDelay(capacityError(Number.NaN))).toBe(300);
  });

  it("never retries when a hash exists anywhere in the error", async () => {
    const hash = `0x${"a".repeat(64)}`;
    const error = Object.assign(capacityError(), { cause: { details: { transactionHash: hash } } });
    const write = vi.fn(() => Promise.reject(error));
    expect(hasTransactionHash(error)).toBe(true);
    expect(isGenLayerCapacityError(error)).toBe(false);
    await expect(writeContractWithCapacityRetry(write)).rejects.toBe(error);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("does not retry generic write errors", async () => {
    const error = new Error("request timed out");
    const write = vi.fn(() => Promise.reject(error));
    await expect(writeContractWithCapacityRetry(write)).rejects.toBe(error);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("uses at most three total write attempts and preserves the capacity error", async () => {
    vi.useFakeTimers();
    try {
      const write = vi.fn(() => Promise.reject(capacityError(100)));
      const pending = writeContractWithCapacityRetry(write);
      const assertion = expect(pending).rejects.toBeInstanceOf(GenLayerCapacityError);
      await vi.runAllTimersAsync();
      await assertion;
      expect(write).toHaveBeenCalledTimes(MAX_GENLAYER_WRITE_ATTEMPTS);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops immediately after a successful hash", async () => {
    vi.useFakeTimers();
    try {
      const hash = `0x${"b".repeat(64)}`;
      const write = vi.fn()
        .mockRejectedValueOnce(capacityError(1_000))
        .mockResolvedValueOnce(hash);
      const pending = writeContractWithCapacityRetry(write);
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(pending).resolves.toBe(hash);
      expect(write).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

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
    expect(result.consensus.principle).toBe("run_nondet_unsafe");
    expect(result.consensus.webEvidence).toBe("strict_eq");
    expect(result.consensus.llmAdjudication).toBe("leader_fn_validator_fn");
    expect(result.consensus.judge).toBe("genlayer_llm");
  });
});