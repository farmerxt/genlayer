"""LLM adjudication of subjective requirements (mocked, under strict_eq)."""

import json

from tests.direct.conftest import build_research_request
from tests.direct.helpers import assert_result_schema


def test_subjective_requirements_judged_by_llm_pass(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})

    direct_vm.mock_llm(
        r".*AGENTZPROOF.*",
        json.dumps({"verdicts": {"REQ-1": "PASS", "REQ-2": "PASS", "REQ-3": "PASS"}}),
    )

    result = json.loads(contract.verify("llm-pass", request))

    assert_result_schema(result)
    assert result["decision"] == "PASS"
    assert result["score"] == 1.0
    for r in result["requirements"]:
        assert r["checked_by"] == "llm"
        assert r["status"] == "PASS"


def test_subjective_requirements_judged_fail(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})

    direct_vm.mock_llm(
        r".*AGENTZPROOF.*",
        json.dumps({"verdicts": {"REQ-1": "PASS", "REQ-2": "FAIL", "REQ-3": "PASS"}}),
    )

    result = json.loads(contract.verify("llm-fail", request))

    assert_result_schema(result)
    assert result["decision"] == "FAIL"
    assert result["score"] == round(2 / 3, 4)  # contract rounds to 4 dp
    by_id = {r["id"]: r for r in result["requirements"]}
    assert by_id["REQ-2"]["status"] == "FAIL"
    assert by_id["REQ-1"]["status"] == "PASS"
    assert by_id["REQ-3"]["status"] == "PASS"


def test_llm_verdict_for_unknown_requirement_discarded(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})

    # LLM hallucinates an extra requirement id + mixes PASS/FAIL.
    direct_vm.mock_llm(
        r".*AGENTZPROOF.*",
        json.dumps(
            {
                "verdicts": {
                    "REQ-1": "PASS",
                    "REQ-2": "FAIL",
                    "REQ-3": "PASS",
                    "REQ-99": "PASS",
                }
            }
        ),
    )

    result = json.loads(contract.verify("llm-halluc", request))

    assert_result_schema(result)
    assert len(result["requirements"]) == 3  # REQ-99 ignored entirely
    assert result["decision"] == "FAIL"