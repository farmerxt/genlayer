"""Tests for the password reset flow — these MUST catch the expired-token bug."""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from reset import PasswordResetService, TOKEN_TTL  # noqa: E402

FAILURES = []


def check(name, condition):
    if not condition:
        FAILURES.append(name)
        print(f"  FAIL: {name}")
    else:
        print(f"  ok:   {name}")


print("password reset flow tests")
svc = PasswordResetService()
email = "alice@example.com"

# 1. Password reset request can be submitted.
token = svc.request_password_reset(email)
check("request_password_reset returns a token", isinstance(token, str) and len(token) >= 16)

# 2. A reset token is generated (unique per request).
token2 = svc.request_password_reset(email)
check("tokens are unique", token != token2)

# 3. Token expires after a defined period.
check("TOKEN_TTL is defined", TOKEN_TTL == timedelta(hours=1))

# 4. User can use the token to set a new password.
svc2 = PasswordResetService()
t = svc2.request_password_reset(email)
check("reset_password accepts a valid token", svc2.reset_password(t, "brand-new-pass") is True)
check("new password works", svc2.verify_password(email, "brand-new-pass") is True)

# 5. Invalid tokens are rejected.
try:
    svc3 = PasswordResetService()
    svc3.reset_password("totally-bogus-token", "x")
    check("invalid token rejected", False)
except ValueError:
    check("invalid token rejected", True)

# 6. Expired tokens are rejected.  <- THIS TEST FAILS against the buggy code
svc4 = PasswordResetService()
t = svc4.request_password_reset(email)
# Force expiry.
svc4._tokens[t]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
try:
    svc4.reset_password(t, "expired-token-pass")
    check("expired token rejected", False)
except ValueError:
    check("expired token rejected", True)

if FAILURES:
    print(f"\n{len(FAILURES)} test(s) FAILED: {', '.join(FAILURES)}")
    sys.exit(1)
print("\nAll tests passed.")