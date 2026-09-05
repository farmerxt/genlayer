# Password Reset Demo — BUGGY VERSION (intentional)

This fixture is used by AgentzProof's demo mode. It deliberately contains a
subtle bug so the verification system can reliably detect a failure:

**The bug:** expired reset tokens are NOT rejected. The code checks that a
token exists and has been used only once, but it never checks whether the
token's expiry time has passed. The test suite includes a test that expired
tokens must be rejected — that test FAILS against this implementation.

## Files

- `reset.py` — the implementation (with the bug)
- `tests/test_password_reset.py` — the test suite

## How the demo detects the bug

The acceptance criterion "Invalid or expired tokens are rejected" is verified
by a `test_command` check: the app runs `python3 tests/test_password_reset.py`
against this repository. The suite exits non-zero because the expired-token
test fails. Every other criterion (endpoint exists, token generated,
expiration defined, password can be reset, tests cover the flow) passes.