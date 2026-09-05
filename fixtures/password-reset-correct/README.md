# Password Reset Demo — CORRECT VERSION

The fixed implementation. `reset_password` now rejects invalid, used, AND
expired tokens. All tests in `tests/test_password_reset.py` pass, so every
acceptance criterion of the demo verification passes → **PASS**.

## Files

- `reset.py` — the implementation (correct)
- `tests/test_password_reset.py` — the test suite (all green)