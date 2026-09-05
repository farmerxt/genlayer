"""Missing or empty deliverable → deterministic checks fail cleanly."""

import json

from tests.direct.conftest import build_password_reset_request
from tests.direct.helpers import assert_result_schema


def test_empty_deliverable_fails(direct_deploy):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = json.loads(
        build_password_reset_request("", expired_tokens_rejected=True)
    )
    request["deliverable"] = {"summary": "", "code": "", "files": {}}
    request = json.dumps(request)

    result = json.loads(contract.verify("empty-1", request))

    assert_result_schema(result)
    assert result["decision"] == "FAIL"
    by_id = {r["id"]: r for r in result["requirements"]}
    assert by_id["REQ-1"]["status"] == "FAIL"
    assert by_id["REQ-2"]["status"] == "FAIL"
    assert by_id["REQ-3"]["status"] == "FAIL"
    assert by_id["REQ-4"]["status"] == "FAIL"
    assert by_id["REQ-5"]["status"] == "FAIL"  # file manifest empty
    assert by_id["REQ-6"]["status"] == "PASS"  # app-reported fact still holds


def test_malformed_request_reverts(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    with direct_vm.expect_revert("Invalid request JSON"):
        contract.verify("bad-1", "this is not json")
    with direct_vm.expect_revert("non-empty 'requirements'"):
        contract.verify("bad-2", json.dumps({"requirements": []}))