"""LLM adjudication under custom leader/validator consensus."""

import json

from tests.direct.conftest import build_research_request
from tests.direct.helpers import assert_result_schema


def llm_response(requirements, reasoning="Independent evaluation."):
    statuses = {key: value.upper() for key, value in requirements.items()}
    return json.dumps(
        {
            "decision": "PASS" if all(value == "PASS" for value in statuses.values()) else "FAIL",
            "requirements": statuses,
            "score": "{:.4f}".format(
                sum(value == "PASS" for value in statuses.values()) / len(statuses)
            ),
            "reasoning": reasoning,
        }
    )


def test_subjective_requirements_judged_by_llm_pass(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})

    direct_vm.mock_llm(
        r".*AGENTZPROOF.*",
        llm_response({"REQ-1": "PASS", "REQ-2": "PASS", "REQ-3": "PASS"}),
    )

    result = json.loads(contract.verify("llm-pass", request))

    assert_result_schema(result)
    assert result["decision"] == "PASS"
    assert result["score"] == 1.0
    assert result["consensus"]["principle"] == "run_nondet_unsafe"
    assert result["consensus"]["llm_adjudication"] == "leader_fn_validator_fn"
    for requirement in result["requirements"]:
        assert requirement["checked_by"] == "llm"
        assert requirement["status"] == "PASS"


def test_subjective_requirements_judged_fail(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})

    direct_vm.mock_llm(
        r".*AGENTZPROOF.*",
        llm_response(
            {"REQ-1": "PASS", "REQ-2": "FAIL", "REQ-3": "PASS"},
            reasoning="The pricing requirement is not adequately supported.",
        ),
    )

    result = json.loads(contract.verify("llm-fail", request))

    assert_result_schema(result)
    assert result["decision"] == "FAIL"
    assert result["score"] == round(2 / 3, 4)
    by_id = {requirement["id"]: requirement for requirement in result["requirements"]}
    assert by_id["REQ-2"]["status"] == "FAIL"
    assert by_id["REQ-1"]["status"] == "PASS"
    assert by_id["REQ-3"]["status"] == "PASS"


def test_validator_accepts_reasoning_difference(direct_deploy, direct_vm):
    """Validator compares decision fields, not natural-language reasoning."""
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})
    leader_response = llm_response(
        {"REQ-1": "PASS", "REQ-2": "PASS", "REQ-3": "PASS"},
        reasoning="Leader explanation.",
    )
    validator_response = llm_response(
        {"REQ-1": "PASS", "REQ-2": "PASS", "REQ-3": "PASS"},
        reasoning="Independent validator explanation with different wording.",
    )
    direct_vm.mock_llm(r".*AGENTZPROOF.*", leader_response)
    json.loads(contract.verify("llm-reasoning", request))
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*AGENTZPROOF.*", validator_response)

    assert direct_vm.run_validator() is True


def test_validator_disagreement_is_rejected(direct_deploy, direct_vm):
    """A validator that reaches different stable verdicts must disagree."""
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})
    leader_response = llm_response(
        {"REQ-1": "PASS", "REQ-2": "PASS", "REQ-3": "PASS"},
        reasoning="Leader explanation.",
    )
    validator_response = llm_response(
        {"REQ-1": "PASS", "REQ-2": "FAIL", "REQ-3": "PASS"},
        reasoning="Independent disagreement.",
    )
    direct_vm.mock_llm(r".*AGENTZPROOF.*", leader_response)
    json.loads(contract.verify("llm-disagreement", request))
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*AGENTZPROOF.*", validator_response)

    assert direct_vm.run_validator() is False


def test_llm_response_with_unknown_requirement_is_rejected(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = build_research_request({})
    response = {
        "decision": "FAIL",
        "requirements": {
            "REQ-1": "PASS",
            "REQ-2": "FAIL",
            "REQ-3": "PASS",
            "REQ-99": "PASS",
        },
        "score": 0.6667,
        "reasoning": "An unknown requirement was included.",
    }
    direct_vm.mock_llm(r".*AGENTZPROOF.*", json.dumps(response))

    result = json.loads(contract.verify("llm-halluc", request))

    assert_result_schema(result)
    assert len(result["requirements"]) == 3
    assert result["decision"] == "FAIL"
    assert all(requirement["status"] == "FAIL" for requirement in result["requirements"])
