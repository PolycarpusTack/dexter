# File: backend/app/models/common.py

"""
Common Pydantic models shared across different API modules.
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, List
from datetime import datetime

class User(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None
    name: Optional[str] = None

class Tag(BaseModel):
    key: str
    value: str