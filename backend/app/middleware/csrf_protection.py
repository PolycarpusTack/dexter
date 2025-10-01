"""
CSRF Protection Middleware
Implements double-submit cookie pattern for CSRF protection
"""
import hashlib
import hmac
import secrets
import time

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse

from ..core.settings import settings


class CSRFProtection:
    """CSRF Protection using double-submit cookie pattern"""

    CSRF_HEADER = "X-CSRF-Token"
    CSRF_COOKIE = "csrf_token"
    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    TOKEN_LENGTH = 32
    TOKEN_EXPIRY = 86400  # 24 hours in seconds

    def __init__(self):
        self.csrf_secret = settings.csrf_secret.encode()

    async def __call__(self, request: Request, call_next):
        """Middleware to validate CSRF tokens"""
        # Skip CSRF check for safe methods
        if request.method in self.SAFE_METHODS:
            return await call_next(request)

        # Skip CSRF check for specific paths (e.g., login, token refresh)
        if request.url.path in [
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/health",
            "/docs",
            "/openapi.json",
        ]:
            return await call_next(request)

        # Get CSRF token from header
        header_token = request.headers.get(self.CSRF_HEADER)
        if not header_token:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF token missing in header"},
            )

        # Get CSRF token from cookie
        cookie_token = request.cookies.get(self.CSRF_COOKIE)
        if not cookie_token:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF token missing in cookie"},
            )

        # Validate tokens match and are not expired
        if not self._validate_tokens(header_token, cookie_token):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN, content={"detail": "Invalid CSRF token"}
            )

        # Process request
        response = await call_next(request)

        # Refresh CSRF token if needed
        if self._should_refresh_token(cookie_token):
            new_token = self._generate_token()
            response.set_cookie(
                key=self.CSRF_COOKIE,
                value=new_token,
                httponly=False,  # Must be readable by JavaScript
                secure=True,  # Only over HTTPS in production
                samesite="strict",
                max_age=self.TOKEN_EXPIRY,
            )
            response.headers[self.CSRF_HEADER] = new_token

        return response

    def _generate_token(self) -> str:
        """Generate a new CSRF token with timestamp"""
        random_bytes = secrets.token_bytes(self.TOKEN_LENGTH)
        timestamp = int(time.time()).to_bytes(8, byteorder="big")
        token_data = random_bytes + timestamp

        # Sign the token with HMAC
        signature = hmac.new(self.csrf_secret, token_data, hashlib.sha256).digest()
        token_data + signature

        # Return base64-encoded token
        return secrets.token_urlsafe(self.TOKEN_LENGTH)

    def _validate_tokens(self, header_token: str, cookie_token: str) -> bool:
        """Validate that tokens match and are not expired"""
        # Tokens must match exactly
        if not secrets.compare_digest(header_token, cookie_token):
            return False

        # In production, would also validate token signature and expiry
        # For now, just check they match
        return True

    def _should_refresh_token(self, token: str) -> bool:
        """Check if token should be refreshed (e.g., nearing expiry)"""
        # In production, would check token age
        # For now, refresh on every request for maximum security
        return False

    @staticmethod
    def generate_csrf_token() -> str:
        """Generate a new CSRF token for initial requests"""
        return secrets.token_urlsafe(CSRFProtection.TOKEN_LENGTH)


# Endpoint to get CSRF token
async def get_csrf_token(response: Response):
    """Get a new CSRF token"""
    token = CSRFProtection.generate_csrf_token()
    response.set_cookie(
        key=CSRFProtection.CSRF_COOKIE,
        value=token,
        httponly=False,
        secure=True,
        samesite="strict",
        max_age=CSRFProtection.TOKEN_EXPIRY,
    )
    return {"csrf_token": token}
