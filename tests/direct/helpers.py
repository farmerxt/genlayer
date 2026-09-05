"""Load fixture source files for direct-mode tests."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def fixture_code(variant: str) -> str:
    """Return reset.py contents for 'buggy' or 'correct' fixture."""
    path = REPO_ROOT / "fixtures" / f"password-reset-{variant}" / "reset.py"
    return path.read_text(encoding="utf-8")


def fixture_deliverable_markdown() -> str:
    """Return the research deliverable markdown."""
    path = REPO_ROOT / "fixtures" / "research-deliverable" / "deliverable.md"
    return path.read_text(encoding="utf-8")


def assert_result_schema(result: dict) -> None:
    """Assert the on-chain result matches the documented schema."""
    assert isinstance(result, dict)
    assert result["decision"] in ("PASS", "FAIL")
    assert isinstance(result["score"], (int, float))
    assert 0.0 <= result["score"] <= 1.0
    assert isinstance(result["requirements"], list)
    assert len(result["requirements"]) > 0
    for req in result["requirements"]:
        assert req["id"]
        assert req["requirement"]
        assert req["status"] in ("PASS", "FAIL")
        assert req["checked_by"] in ("deterministic", "llm")
        assert isinstance(req["reason"], str) and req["reason"]
    assert isinstance(result["evidence"], list)
    for ev in result["evidence"]:
        assert ev["source"]
        assert ev["claim"]
        assert isinstance(ev["used"], bool)
        assert isinstance(ev["fetched"], bool)
    assert isinstance(result["summary"], str)
    assert result["verification_version"] == "1.0"
    assert result["consensus"]["method"] == "equivalence_principle"