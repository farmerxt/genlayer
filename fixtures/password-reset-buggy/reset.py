"""Password reset flow — intentionally buggy demo implementation.

BUG (by design, for the AgentzProof FAIL demo):
`reset_password` never verifies that the token is still valid (not expired).
It only checks that a token exists. The test suite catches this.

Run: python3 reset.py  (self-check demo)
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

TOKEN_TTL = timedelta(hours=1)


class PasswordResetService:
    """Minimal password-reset service used by the AgentzProof demo fixtures."""

    def __init__(self):
        # token -> {"email": str, "expires_at": datetime, "used": bool}
        self._tokens = {}
        # email -> new password (demo persistence, no real DB)
        self._passwords = {}

    # 1. Password reset request can be submitted.
    def request_password_reset(self, email):
        """Create a reset token for the given email."""
        if not email or "@" not in email:
            raise ValueError("A valid email is required")
        token = secrets.token_hex(16)
        self._tokens[token] = {
            "email": email,
            "expires_at": datetime.now(timezone.utc) + TOKEN_TTL,
            "used": False,
        }
        return token

    # 2. A reset token is generated.  (see request_password_reset)

    # 3. Token expires after a defined period.
    def _token_is_expired(self, token):
        record = self._tokens.get(token)
        if record is None:
            return False
        return datetime.now(timezone.utc) > record["expires_at"]

    # 4. User can use the token to set a new password.
    def reset_password(self, token, new_password):
        """Set a new password using a reset token.

        BUG: expired tokens are accepted. The expiry check is never invoked,
        so an attacker who obtains an old token can still reset the password.
        """
        record = self._tokens.get(token)
        if record is None:
            raise ValueError("Invalid reset token")
        if record["used"]:
            raise ValueError("Reset token already used")
        # NOTE: _token_is_expired(token) is never checked here — this is the
        # intentional bug the verification system must detect.
        record["used"] = True
        self._passwords[record["email"]] = self._hash(new_password)
        return True

    def _hash(self, password):
        return hashlib.sha256(password.encode()).hexdigest()

    def verify_password(self, email, password):
        return self._passwords.get(email) == self._hash(password)


if __name__ == "__main__":
    svc = PasswordResetService()
    email = "alice@example.com"
    token = svc.request_password_reset(email)
    assert svc.reset_password(token, "new-password-1") is True
    assert svc.verify_password(email, "new-password-1") is True
    print("Self-check: basic flow works (the expiry bug is not caught here).")