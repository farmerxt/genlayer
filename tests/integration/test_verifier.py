"""Integration tests — run against a GenLayer network with real consensus.

Requires GenLayer Studio (local or hosted) or a testnet node. Run with:

    gltest tests/integration/ -v -s

See README → "Deploy the Intelligent Contract" and "Integration tests".
"""

import json

from tests.direct.conftest import build_password_reset_request
from tests.direct.helpers import fixture_code


def test_pass_scenario_with_real_consensus(
    gl_contract, gl_network, gl_account, gl_deploy, gl_transaction
):
    """Deploy AgentzProofVerifier and adjudicate the PASS demo on-chain."""
    contract = gl_deploy("contracts/AgentzProofVerifier.py")
    assert contract is not None

    request = build_password_reset_request(
        code=fixture_code("correct"), expired_tokens_rejected=True
    )

    receipt = gl_transaction(
        contract.verify, "integration-pass-1", request, account=gl_account
    )
    assert receipt is not None

    # Read back via a view call (accepted state).
    result = contract.get_verification("integration-pass-1")
    assert isinstance(result, dict)
    assert result["decision"] == "PASS"
    assert result["score"] == 1.0
    assert result["verification_version"] == "1.0"


def test_fail_scenario_with_real_consensus(
    gl_contract, gl_network, gl_account, gl_deploy, gl_transaction
):
    """Adjudicate the FAIL demo (buggy implementation) on-chain."""
    contract = gl_deploy("contracts/AgentzProofVerifier.py")

    request = build_password_reset_request(
        code=fixture_code("buggy"), expired_tokens_rejected=False
    )

    receipt = gl_transaction(
        contract.verify, "integration-fail-1", request, account=gl_account
    )
    assert receipt is not None

    result = contract.get_verification("integration-fail-1")
    assert result["decision"] == "FAIL"
    by_id = {r["id"]: r["status"] for r in result["requirements"]}
    assert by_id["REQ-6"] == "FAIL"
    assert by_id["REQ-1"] == "PASS"