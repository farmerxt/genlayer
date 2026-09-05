import { describe, expect, it } from "vitest";
import { validateResultSchema } from "@/lib/verifier/schema";
import { sanitizeRequirements, sanitizeEvidenceUrls, ValidationError } from "@/lib/verifier/service";
import { toOnChainRequestJson } from "@/lib/verifier/serialize";
import type { VerificationResult } from "@/lib/types";

function validResult(): VerificationResult {
  return {
    verificationId: "v1",
    verificationVersion: "1.0",
    decision: "PASS",
    score: 1,
    requirements: [
      {
        id: "REQ-1",
        requirement: "Token generated",
        status: "PASS",
        checkedBy: "deterministic",
        reason: "Required content found in submitted deliverable.",
      },
    ],
    evidence: [{ source: "test", claim: "exit 0", used: true, fetched: false }],
    summary: "1 of 1 requirements satisfied. Decision: PASS.",
    consensus: { method: "equivalence_principle", principle: "strict_eq", judge: "genlayer_llm" },
    mode: "demo",
    verifiedAt: "2026-09-05T00:00:00Z",
  };
}

describe("result schema validation", () => {
  it("accepts a valid result", () => {
    expect(() => validateResultSchema(validResult())).not.toThrow();
  });

  it("rejects a bad decision", () => {
    const r = validResult();
    (r as { decision: string }).decision = "MAYBE";
    expect(() => validateResultSchema(r)).toThrow(/decision/);
  });

  it("rejects a score out of range", () => {
    const r = validResult();
    r.score = 1.5;
    expect(() => validateResultSchema(r)).toThrow(/score/);
  });

  it("rejects a requirement with a missing reason", () => {
    const r = validResult();
    r.requirements[0].reason = "";
    expect(() => validateResultSchema(r)).toThrow(/reason/);
  });

  it("rejects missing evidence fields", () => {
    const r = validResult();
    (r.evidence[0] as { used?: boolean }).used = undefined as never;
    expect(() => validateResultSchema(r)).toThrow(/evidence/);
  });

  it("rejects an empty requirements list", () => {
    const r = validResult();
    r.requirements = [];
    expect(() => validateResultSchema(r)).toThrow(/non-empty/);
  });
});

describe("request sanitization", () => {
  it("parses requirements and assigns ids", () => {
    const reqs = sanitizeRequirements([
      { text: "Token generated" },
      { text: "Expired tokens rejected", check: { type: "reported", passed: false } },
    ]);
    expect(reqs[0].id).toBe("REQ-1");
    expect(reqs[1].check?.type).toBe("reported");
  });

  it("rejects empty criteria", () => {
    expect(() => sanitizeRequirements([])).toThrow(ValidationError);
    expect(() => sanitizeRequirements(undefined)).toThrow(ValidationError);
  });

  it("rejects unknown check types", () => {
    expect(() =>
      sanitizeRequirements([{ text: "x", check: { type: "rm -rf" } }]),
    ).toThrow(/unknown check type/);
  });

  it("filters non-http evidence URLs", () => {
    const urls = sanitizeEvidenceUrls([
      "https://example.com/ok",
      "javascript:alert(1)",
      "ftp://x",
      "not a url",
      "http://example.com/two",
    ]);
    expect(urls).toEqual(["https://example.com/ok", "http://example.com/two"]);
  });
});

describe("on-chain serialization", () => {
  it("maps camelCase to the contract schema", () => {
    const json = toOnChainRequestJson({
      version: "1.0",
      title: "T",
      task: "D",
      requirements: [{ id: "REQ-1", text: "R" }],
      deliverable: { summary: "s", code: "c", files: {} },
      evidence: [{ source: "s", claim: "c", content: "x" }],
      evidenceUrls: ["https://example.com"],
      repository: { url: "https://github.com/x", commitSha: "abc" },
      metadata: { creator: "c", agent: "a", submittedAt: "2026-01-01T00:00:00Z" },
    });
    const parsed = JSON.parse(json);
    expect(parsed.evidence_urls).toEqual(["https://example.com"]);
    expect(parsed.repository.commit_sha).toBe("abc");
    expect(parsed.metadata.submitted_at).toBe("2026-01-01T00:00:00Z");
    expect(parsed.requirements[0].text).toBe("R");
  });
});