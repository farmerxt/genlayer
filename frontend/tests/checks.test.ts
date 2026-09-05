import { describe, expect, it } from "vitest";
import { deliverableHaystack, executePureCheck } from "@/lib/verifier/checks";
import type { CheckSpec, Deliverable } from "@/lib/types";

const DELIVERABLE: Deliverable = {
  summary: "Implemented password reset",
  code: `def request_password_reset(email):\n    token = secrets.token_hex(16)\n    return token\n\ndef reset_password(token, new_password):\n    if token is None:\n        raise ValueError("invalid")\n`,
  files: { "tests/test_password_reset.py": "# tests" },
};

function run(check: CheckSpec, deliv: Deliverable = DELIVERABLE) {
  return executePureCheck(check, deliverableHaystack(deliv), deliv.files);
}

describe("deterministic checks", () => {
  it("string_present: finds the required string", () => {
    const out = run({ type: "string_present", needle: "request_password_reset" });
    expect(out.status).toBe("PASS");
    expect(out.reason).toContain("found");
  });

  it("string_present: fails when missing", () => {
    const out = run({ type: "string_present", needle: "sendgrid_api_key" });
    expect(out.status).toBe("FAIL");
    expect(out.reason).toContain("missing");
  });

  it("function_exists: finds the def", () => {
    expect(run({ type: "function_exists", name: "reset_password" }).status).toBe("PASS");
    expect(run({ type: "function_exists", name: "admin_panel" }).status).toBe("FAIL");
  });

  it("regex: matches and rejects", () => {
    expect(run({ type: "regex", pattern: "token_hex\\(" }).status).toBe("PASS");
    expect(run({ type: "regex", pattern: "\\bclass\\s+Admin" }).status).toBe("FAIL");
  });

  it("file_exists: checks the manifest", () => {
    expect(run({ type: "file_exists", path: "tests/test_password_reset.py" }).status).toBe("PASS");
    expect(run({ type: "file_exists", path: "src/secret.ts" }).status).toBe("FAIL");
  });

  it("reported: ingests app-verified facts", () => {
    expect(
      run({ type: "reported", passed: true, evidence: "test suite exit 0" }).status,
    ).toBe("PASS");
    expect(
      run({ type: "reported", passed: false, evidence: "test suite exit 1" }).status,
    ).toBe("FAIL");
  });

  it("unknown check type fails closed", () => {
    expect(run({ type: "bogus" as never, pattern: "x" }).status).toBe("FAIL");
  });

  it("haystack includes file contents", () => {
    const hay = deliverableHaystack(DELIVERABLE);
    expect(hay).toContain("FILE: tests/test_password_reset.py");
    expect(hay).toContain("# tests");
  });
});