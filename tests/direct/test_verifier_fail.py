"""FAIL scenario: buggy implementation — expired tokens are accepted."""

import json

from tests.direct.conftest import build_password_reset_request
from tests.direct.helpers import assert_result_schema, fixture_code


def test_buggy_implementation_fails(direct_deploy):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    # App-verified fact: the fixture test suite failed the expired-token test.
    request = build_password_reset_request(
        code=fixture_code("buggy"), expired_tokens_rejected=False
    )

    raw = contract.verify("demo-fail-1", request)
    result = json.loads(raw)

    assert_result_schema(result)
    assert result["decision"] == "FAIL"
    assert result["score"] == round(5 / 6, 4)  # contract rounds to 4 dp

    by_id = {r["id"]: r for r in result["requirements"]}
    assert by_id["REQ-1"]["status"] == "PASS"
    assert by_id["REQ-2"]["status"] == "PASS"
    assert by_id["REQ-3"]["status"] == "PASS"
    assert by_id["REQ-4"]["status"] == "PASS"
    assert by_id["REQ-5"]["status"] == "PASS"
    # The bug: expired tokens are accepted → requirement fails.
    assert by_id["REQ-6"]["status"] == "FAIL"
    assert by_id["REQ-6"]["checked_by"] == "deterministic"
    assert "not met" in by_id["REQ-6"]["reason"].lower()
    assert "5 of 6 requirements satisfied" in result["summary"]


def test_reported_evidence_surface_in_reason(direct_deploy):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_password_reset_request(
        code=fixture_code("buggy"), expired_tokens_rejected=False
    )

    result = json.loads(contract.verify("demo-fail-2", request))
    by_id = {r["id"]: r for r in result["requirements"]}
    assert "test suite" in by_id["REQ-6"]["reason"].lower() or "evidence" in by_id["REQ-6"]["reason"].lower()