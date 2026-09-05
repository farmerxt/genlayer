"""Invalid evidence URLs must not break verification or be fetched."""

import json

from tests.direct.conftest import build_password_reset_request
from tests.direct.helpers import assert_result_schema, fixture_code


def test_non_http_urls_are_filtered_out(direct_deploy):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = json.loads(
        build_password_reset_request(fixture_code("correct"), expired_tokens_rejected=True)
    )
    request["evidence_urls"] = [
        "not-a-url",
        "ftp://example.com/file",
        "javascript:alert(1)",
        "",
    ]
    request = json.dumps(request)

    result = json.loads(contract.verify("url-1", request))

    assert_result_schema(result)
    # None of the invalid URLs were fetched (they never reached the web block).
    fetched_sources = [e["source"] for e in result["evidence"] if e["fetched"]]
    assert all(not s.startswith(("not-a-url", "ftp:", "javascript:")) for s in fetched_sources)
    assert result["decision"] == "PASS"


def test_unreachable_http_url_is_reported_not_crashing(direct_deploy, direct_vm):
    contract = direct_deploy("contracts/AgentzProofVerifier.py")
    request = json.loads(
        build_password_reset_request(fixture_code("correct"), expired_tokens_rejected=True)
    )
    # http_status check on an unreachable endpoint → mock web render failure.
    request["requirements"].append(
        {
            "id": "REQ-7",
            "text": "Status page is reachable.",
            "check": {"type": "http_status", "url": "https://example.com/status"},
        }
    )
    direct_vm.mock_web(r".*example\.com/status.*", {"status": 500, "body": ""})
    request = json.dumps(request)

    result = json.loads(contract.verify("url-2", request))

    assert_result_schema(result)
    assert result["decision"] == "FAIL"
    by_id = {r["id"]: r for r in result["requirements"]}
    assert by_id["REQ-7"]["status"] == "FAIL"
    assert by_id["REQ-7"]["checked_by"] == "deterministic"