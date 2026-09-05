"""Shared helpers for AgentzProofVerifier direct-mode tests."""

import json

# ---------------------------------------------------------------------------
# Demo request builders — mirror exactly what the frontend sends on-chain.
# ---------------------------------------------------------------------------

PASSWORD_RESET_CRITERIA = [
    {
        "id": "REQ-1",
        "text": "Password reset request can be submitted.",
        "check": {"type": "string_present", "needle": "request_password_reset"},
    },
    {
        "id": "REQ-2",
        "text": "A reset token is generated.",
        "check": {"type": "string_present", "needle": "token_hex"},
    },
    {
        "id": "REQ-3",
        "text": "Token expires after a defined period.",
        "check": {"type": "string_present", "needle": "expires_at"},
    },
    {
        "id": "REQ-4",
        "text": "User can use the token to set a new password.",
        "check": {"type": "function_exists", "name": "reset_password"},
    },
    {
        "id": "REQ-5",
        "text": "Tests cover the password reset flow.",
        "check": {"type": "file_exists", "path": "tests/test_password_reset.py"},
    },
    {
        "id": "REQ-6",
        "text": "Invalid or expired tokens are rejected.",
        # "reported" = app-verified fact (the app runs the fixture test suite
        # and reports the outcome; the contract ingests it as ground truth).
        "check": {
            "type": "reported",
            "passed": True,  # overridden per test
            "evidence": "test suite: python3 tests/test_password_reset.py",
        },
    },
]


def password_reset_deliverable(code: str) -> dict:
    """Deliverable payload (summary + code + file manifest)."""
    return {
        "summary": (
            "Implemented a password reset flow: request_password_reset "
            "creates a time-limited token, reset_password consumes it, "
            "tests cover the full flow."
        ),
        "code": code,
        "files": {
            "reset.py": code,
            "tests/test_password_reset.py": (
                "# test suite covering the password reset flow"
            ),
        },
    }


def build_password_reset_request(
    code: str,
    expired_tokens_rejected: bool,
    extra_deliverable_text: str = "",
) -> str:
    """Build the exact VerificationRequest JSON for the demo scenario."""
    criteria = json.loads(json.dumps(PASSWORD_RESET_CRITERIA))
    criteria[5]["check"]["passed"] = expired_tokens_rejected
    deliv = password_reset_deliverable(code)
    if extra_deliverable_text:
        deliv["code"] = code + "\n\n" + extra_deliverable_text
    request = {
        "version": "1.0",
        "title": "Implement a password reset flow",
        "task": "Implement a password reset flow for this application.",
        "requirements": criteria,
        "deliverable": deliv,
        "evidence": [
            {
                "source": "fixture test suite",
                "claim": "python3 tests/test_password_reset.py",
                "content": (
                    "test suite exit code 0"
                    if expired_tokens_rejected
                    else "test suite exit code 1 (expired token test failed)"
                ),
            }
        ],
        "evidence_urls": [],
        "repository": {"url": "https://github.com/demo/password-reset", "commit_sha": "abc123"},
        "metadata": {"creator": "demo-buyer", "agent": "demo-agent", "submitted_at": "2026-09-05T00:00:00Z"},
    }
    return json.dumps(request)


def build_research_request(llm_verdicts: dict) -> str:
    """Subjective-only request (no deterministic checks) — LLM adjudicates."""
    request = {
        "version": "1.0",
        "title": "Market research deliverable",
        "task": "Produce a market research summary on AI coding agents.",
        "requirements": [
            {"id": "REQ-1", "text": "Summarize adoption trends with a concrete statistic."},
            {"id": "REQ-2", "text": "Summarize the dominant pricing models."},
            {"id": "REQ-3", "text": "Explain the emerging verification layer and its requirements."},
        ],
        "deliverable": {
            "summary": "Research summary on AI coding agent adoption, pricing, and the verification layer.",
            "code": "",
            "files": {"deliverable.md": "61% adoption ... $20/month median ... verification layer"},
        },
        "evidence": [
            {
                "source": "evidence/adoption-survey.md",
                "claim": "61% of developers use an AI coding agent weekly",
                "content": "61% of professional developers use an AI coding agent at least weekly.",
            },
            {
                "source": "evidence/pricing.md",
                "claim": "median seat price is $20/month",
                "content": "Median individual subscription: $20/month.",
            },
            {
                "source": "evidence/verification-layer.md",
                "claim": "verification layer requirements: deterministic checks, adjudication, auditable PASS/FAIL",
                "content": "Requirements: deterministic checks, independent adjudication, auditable PASS/FAIL.",
            },
        ],
        "evidence_urls": [],
        "metadata": {"creator": "demo-buyer", "agent": "research-agent", "submitted_at": "2026-09-05T00:00:00Z"},
    }
    return json.dumps(request)