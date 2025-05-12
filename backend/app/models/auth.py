"""
Authentication and user models.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class User(BaseModel):
    """User model for authentication."""
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    role: str = "user"
    org: str = "sentry"
    permissions: List[str] = []
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == "admin" or "admin" in self.permissions


class Token(BaseModel):
    """Token model for JWT authentication."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    refresh_token: Optional[str] = None
    

class TokenData(BaseModel):
    """Token data model for JWT payload."""
    sub: str
    scopes: List[str] = []
    exp: Optional[int] = None
    iat: Optional[int] = None
