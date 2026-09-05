"""Integration tests — run against a GenLayer network with real consensus.

Requires a running GenLayer node (local simulator via `glsim`, or Studio/testnet).
Run with:

    # Start the local GenLayer simulator in a separate terminal:
    #   .venv/bin/glsim --seed 42
    # Then from the repo root:
    gltest tests/integration/ -v -s

See README → "Deploy the Intelligent Contract" and "Integration tests".

These tests use the genlayer-py SDK directly via the `gl_client` and
`default_account` fixtures provided by the genlayer-test plugin. They deploy
the AgentzProofVerifier contract on-chain, submit a real verification request,
and read back the consensus result.
"""

import json
from pathlib import Path

import pytest
from genlayer_py.types import TransactionStatus
from gltest.clients import get_gl_client
from gltest.accounts import get_default_account


REPO_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture(scope="module")
def gl_client_fixture(gl_client):
    """Proxy to the session-scoped gl_client fixture."""
    return gl_client


@pytest.fixture(scope="module")
def gl_account_fixture(default_account):
    """Proxy to the session-scoped default_account fixture."""
    return default_account


def _deploy_contract(client, account, contract_path: str):
    """Deploy a GenLayer Intelligent Contract and return (address, client)."""
    code = Path(REPO_ROOT / contract_path).read_text(encoding="utf-8")
    # deploy_contract returns a transaction hash; we wait for FINALIZED.
    tx_hash = client.deploy_contract(
        code=code,
        account=account,
        args=[],
    )
    receipt = client.wait_for_transaction_receipt(
        tx_hash,
        status=TransactionStatus.FINALIZED,
        retries=200,
    )
    # Extract contract address: localnet uses receipt["data"]["contract_address"],
    # testnet uses receipt["tx_data_decoded"]["contract_address"]
    decoded = receipt.get("tx_data_decoded") or {}
    data = receipt.get("data") or {}
    contract_address = decoded.get("contract_address") or data.get("contract_address")
    assert contract_address, f"No contract address in receipt: {receipt}"
    return contract_address


def _call_verify(client, account, contract_address, verification_id, request_json):
    """Submit a verification request (on-chain, requires consensus)."""
    tx_hash = client.write_contract(
        address=contract_address,
        function_name="verify",
        args=[verification_id, request_json],
        account=account,
    )
    client.wait_for_transaction_receipt(
        tx_hash,
        status=TransactionStatus.FINALIZED,
        retries=200,
    )


def _read_verification(client, contract_address, verification_id):
    """Read the stored verification result via a view call."""
    result = client.read_contract(
        address=contract_address,
        function_name="get_verification",
        args=[verification_id],
    )
    if isinstance(result, str):
        result = json.loads(result)
    return result


def test_pass_scenario_with_real_consensus(gl_client, default_account):
    """Deploy AgentzProofVerifier and adjudicate the PASS demo on-chain."""
    from tests.direct.conftest import build_password_reset_request
    from tests.direct.helpers import fixture_code

    address = _deploy_contract(
        gl_client, default_account, "contracts/AgentzProofVerifier.py"
    )
    assert address

    request = build_password_reset_request(
        code=fixture_code("correct"), expired_tokens_rejected=True
    )

    _call_verify(gl_client, default_account, address, "integration-pass-1", request)

    result = _read_verification(gl_client, address, "integration-pass-1")
    assert isinstance(result, dict)
    assert result["decision"] == "PASS"
    assert result["score"] == 1.0
    assert result["verification_version"] == "1.0"


def test_fail_scenario_with_real_consensus(gl_client, default_account):
    """Adjudicate the FAIL demo (buggy implementation) on-chain."""
    from tests.direct.conftest import build_password_reset_request
    from tests.direct.helpers import fixture_code

    address = _deploy_contract(
        gl_client, default_account, "contracts/AgentzProofVerifier.py"
    )
    assert address

    request = build_password_reset_request(
        code=fixture_code("buggy"), expired_tokens_rejected=False
    )

    _call_verify(gl_client, default_account, address, "integration-fail-1", request)

    result = _read_verification(gl_client, address, "integration-fail-1")
    assert result["decision"] == "FAIL"
    by_id = {r["id"]: r["status"] for r in result["requirements"]}
    assert by_id["REQ-6"] == "FAIL"
    assert by_id["REQ-1"] == "PASS"