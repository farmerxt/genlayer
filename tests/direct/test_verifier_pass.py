"""PASS scenario: correct password-reset implementation satisfies all criteria."""

import json

from tests.direct.conftest import build_password_reset_request
from tests.direct.helpers import assert_result_schema, fixture_code


def test_correct_implementation_passes(direct_deploy):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_password_reset_request(
        code=fixture_code("correct"), expired_tokens_rejected=True
    )

    raw = contract.verify("demo-pass-1", request)
    result = json.loads(raw)

    assert_result_schema(result)
    assert result["decision"] == "PASS"
    assert result["score"] == 1.0
    assert result["verification_id"] == "demo-pass-1"

    statuses = {r["id"]: r["status"] for r in result["requirements"]}
    assert statuses == {
        "REQ-1": "PASS",
        "REQ-2": "PASS",
        "REQ-3": "PASS",
        "REQ-4": "PASS",
        "REQ-5": "PASS",
        "REQ-6": "PASS",
    }
    # All requirements were settled deterministically (no LLM call needed).
    assert all(r["checked_by"] == "deterministic" for r in result["requirements"])
    assert "6 of 6 requirements satisfied" in result["summary"]


def test_result_stored_on_chain(direct_deploy):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_password_reset_request(
        code=fixture_code("correct"), expired_tokens_rejected=True
    )

    contract.verify("stored-1", request)
    stored = contract.get_verification("stored-1")
    assert stored["decision"] == "PASS"
    assert stored["verification_id"] == "stored-1"

    ids = contract.get_verification_ids()
    assert "stored-1" in ids


def test_unknown_id_returns_empty(direct_deploy):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    assert contract.get_verification("nope") == {}