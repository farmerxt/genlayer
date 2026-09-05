/**
 * Built-in demo scenarios — one-click for judges. No configuration required.
 *
 *   demo-fail     : Password Reset Implementation        → expected FAIL
 *   demo-pass     : Password Reset Implementation (fixed) → expected PASS
 *   demo-research : Research Deliverable                  → expected PASS
 *
 * Deliverable/evidence text is loaded from the repo fixtures/ directory when
 * available (single source of truth) and falls back to embedded copies so the
 * frontend works standalone.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { RequirementSpec, VerificationRequest } from "@/lib/types";
import { expectedExitCode, runFixtureTestSuite } from "@/lib/demo/fixture-runner";

export interface DemoScenario {
  id: string;
  label: string;
  expected: "PASS" | "FAIL";
  tagline: string;
  buildRequest: () => Promise<VerificationRequest>;
}

const FIXTURES_ROOT = path.resolve(process.cwd(), "../fixtures");

function readFixture(rel: string): string | null {
  const p = path.join(FIXTURES_ROOT, rel);
  try {
    if (existsSync(p)) return readFileSync(p, "utf-8");
  } catch {
    /* fall through to embedded */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Embedded copies (standalone fallback) — keep in sync with fixtures/.
// ---------------------------------------------------------------------------

const BUGGY_CODE = `"""Password reset flow — intentionally buggy demo implementation."""
import secrets
from datetime import datetime, timedelta, timezone

TOKEN_TTL = timedelta(hours=1)

class PasswordResetService:
    def __init__(self):
        self._tokens = {}
        self._passwords = {}

    def request_password_reset(self, email):
        if not email or "@" not in email:
            raise ValueError("A valid email is required")
        token = secrets.token_hex(16)
        self._tokens[token] = {
            "email": email,
            "expires_at": datetime.now(timezone.utc) + TOKEN_TTL,
            "used": False,
        }
        return token

    def _token_is_expired(self, token):
        record = self._tokens.get(token)
        if record is None:
            return False
        return datetime.now(timezone.utc) > record["expires_at"]

    def reset_password(self, token, new_password):
        record = self._tokens.get(token)
        if record is None:
            raise ValueError("Invalid reset token")
        if record["used"]:
            raise ValueError("Reset token already used")
        # BUG: expiry is never checked — expired tokens are accepted.
        record["used"] = True
        self._passwords[record["email"]] = self._hash(new_password)
        return True

    def _hash(self, password):
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

    def verify_password(self, email, password):
        return self._passwords.get(email) == self._hash(password)
`;

const CORRECT_CODE = BUGGY_CODE.replace(
  `        # BUG: expiry is never checked — expired tokens are accepted.
        record["used"] = True`,
  `        if self._token_is_expired(token):
            raise ValueError("Reset token has expired")
        record["used"] = True`,
);

const TEST_SUITE = `"""Tests for the password reset flow."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from reset import PasswordResetService, TOKEN_TTL

FAILURES = []

def check(name, condition):
    if not condition:
        FAILURES.append(name)
        print(f"  FAIL: {name}")
    else:
        print(f"  ok:   {name}")

print("password reset flow tests")
email = "alice@example.com"

svc = PasswordResetService()
token = svc.request_password_reset(email)
check("request_password_reset returns a token", isinstance(token, str) and len(token) >= 16)
token2 = svc.request_password_reset(email)
check("tokens are unique", token != token2)
check("TOKEN_TTL is defined", TOKEN_TTL == timedelta(hours=1))

svc2 = PasswordResetService()
t = svc2.request_password_reset(email)
check("reset_password accepts a valid token", svc2.reset_password(t, "brand-new-pass") is True)
check("new password works", svc2.verify_password(email, "brand-new-pass") is True)

try:
    PasswordResetService().reset_password("totally-bogus-token", "x")
    check("invalid token rejected", False)
except ValueError:
    check("invalid token rejected", True)

svc4 = PasswordResetService()
t = svc4.request_password_reset(email)
svc4._tokens[t]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
try:
    svc4.reset_password(t, "expired-token-pass")
    check("expired token rejected", False)
except ValueError:
    check("expired token rejected", True)

if FAILURES:
    print(f"\\n{len(FAILURES)} test(s) FAILED: {', '.join(FAILURES)}")
    sys.exit(1)
print("\\nAll tests passed.")
`;

// ---------------------------------------------------------------------------
// Scenario builders
// ---------------------------------------------------------------------------

export const PASSWORD_RESET_REQUIREMENTS: RequirementSpec[] = [
  {
    id: "REQ-1",
    text: "Password reset request can be submitted.",
    check: { type: "string_present", needle: "request_password_reset" },
  },
  {
    id: "REQ-2",
    text: "A reset token is generated.",
    check: { type: "string_present", needle: "token_hex" },
  },
  {
    id: "REQ-3",
    text: "Token expires after a defined period.",
    check: { type: "string_present", needle: "expires_at" },
  },
  {
    id: "REQ-4",
    text: "User can use the token to set a new password.",
    check: { type: "function_exists", name: "reset_password" },
  },
  {
    id: "REQ-5",
    text: "Tests cover the password reset flow.",
    check: { type: "file_exists", path: "tests/test_password_reset.py" },
  },
  {
    id: "REQ-6",
    text: "Invalid or expired tokens are rejected.",
    check: { type: "reported", passed: true, evidence: "fixture test suite" },
  },
];

async function buildPasswordResetRequest(variant: "buggy" | "correct"): Promise<VerificationRequest> {
  const code = variant === "buggy" ? BUGGY_CODE : CORRECT_CODE;
  const testFile = readFixture(`${variant === "buggy" ? "password-reset-buggy" : "password-reset-correct"}/tests/test_password_reset.py`) ?? TEST_SUITE;
  const summary =
    variant === "buggy"
      ? "Implemented a password reset flow: request_password_reset creates a time-limited token, reset_password consumes it, tests cover the full flow. (Demo submission with an intentional defect.)"
      : "Implemented a password reset flow: request_password_reset creates a time-limited token, reset_password rejects invalid/used/expired tokens, tests cover the full flow.";

  // Run the controlled fixture test suite to produce the `reported` fact.
  const suite = runFixtureTestSuite(variant);
  const expiredTokensRejected = suite.ran ? suite.exitCode === 0 : expectedExitCode(variant) === 0;

  const requirements = PASSWORD_RESET_REQUIREMENTS.map((r) =>
    r.id === "REQ-6"
      ? {
          ...r,
          check: {
            type: "reported" as const,
            passed: expiredTokensRejected,
            evidence: `fixture test suite exited ${suite.exitCode ?? "unknown"}`,
          },
        }
      : r,
  );

  return {
    version: "1.0",
    title: variant === "buggy" ? "Implement a password reset flow" : "Implement a password reset flow (correct)",
    task: "Implement a password reset flow for this application. Users must be able to request a reset, receive a time-limited token, and set a new password. Invalid or expired tokens must be rejected.",
    requirements,
    deliverable: {
      summary,
      code,
      files: { "reset.py": code, "tests/test_password_reset.py": testFile },
    },
    evidence: [
      {
        source: "fixture test suite",
        claim: `python3 tests/test_password_reset.py → exit ${suite.exitCode ?? "n/a"}`,
        content: suite.output.slice(0, 2000),
      },
    ],
    evidenceUrls: [],
    repository: {
      url: "https://github.com/agentzproof/password-reset-demo",
      commitSha: variant === "buggy" ? "a1b2c3d" : "e4f5g6h",
    },
    metadata: {
      creator: "Demo Buyer",
      agent: "demo-agent",
      submittedAt: new Date().toISOString(),
      reward: "0.1 GEN",
      deadline: new Date(Date.now() + 48 * 3600_000).toISOString(),
      evidenceRequirements: ["Test suite output", "Source code"],
    },
  };
}

async function buildResearchRequest(): Promise<VerificationRequest> {
  const deliverableMd =
    readFixture("research-deliverable/deliverable.md") ??
    "# Market Research Deliverable: AI Coding Agents\n\n61% of developers use an AI coding agent weekly. Median seat price is $20/month. A new verification layer is emerging with deterministic checks, adjudication, and auditable PASS/FAIL.";

  const evidenceFiles = [
    ["evidence/adoption-survey.md", "61% of developers use an AI coding agent weekly", "61% of professional developers use an AI coding agent at least weekly."],
    ["evidence/pricing.md", "median seat price is $20/month", "Median individual subscription: $20/month across the five most-used tools."],
    ["evidence/verification-layer.md", "verification layer needs deterministic checks, adjudication, auditable PASS/FAIL", "Requirements: deterministic checks, independent adjudication, auditable PASS/FAIL records, evidence provenance."],
  ] as const;

  return {
    version: "1.0",
    title: "Market research on AI coding agents",
    task: "Produce a concise market research deliverable on AI coding agents: adoption trends, pricing models, and the emerging verification layer.",
    requirements: [
      { id: "REQ-1", text: "Summarize adoption trends with a concrete statistic." },
      { id: "REQ-2", text: "Summarize the dominant pricing models." },
      { id: "REQ-3", text: "Explain the emerging verification layer and its requirements." },
    ],
    deliverable: {
      summary: "Research summary on AI coding agent adoption, pricing, and the emerging verification layer.",
      code: "",
      files: { "deliverable.md": deliverableMd },
    },
    evidence: evidenceFiles.map(([source, claim, content]) => ({
      source,
      claim,
      content: readFixture(`research-deliverable/${source}`) ?? content,
    })),
    evidenceUrls: [],
    metadata: {
      creator: "Demo Buyer",
      agent: "research-agent",
      submittedAt: new Date().toISOString(),
      reward: "0.05 GEN",
      deadline: new Date(Date.now() + 72 * 3600_000).toISOString(),
      evidenceRequirements: ["Sources", "Statistics"],
    },
  };
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "demo-fail",
    label: "Password Reset Implementation",
    expected: "FAIL",
    tagline: "Expired reset tokens are incorrectly accepted",
    buildRequest: () => buildPasswordResetRequest("buggy"),
  },
  {
    id: "demo-pass",
    label: "Password Reset Implementation — Correct",
    expected: "PASS",
    tagline: "Expired tokens are properly rejected",
    buildRequest: () => buildPasswordResetRequest("correct"),
  },
  {
    id: "demo-research",
    label: "Research Deliverable",
    expected: "PASS",
    tagline: "Subjective research task adjudicated from evidence",
    buildRequest: () => buildResearchRequest(),
  },
];

export function getDemoScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}