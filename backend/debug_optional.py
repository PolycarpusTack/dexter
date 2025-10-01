#!/usr/bin/env python3
import sys
import traceback

sys.path.insert(0, '.')

# Enable more detailed error output
import logging
logging.basicConfig(level=logging.DEBUG)

# Import individually to see if we have BaseModel issue
from pydantic import BaseModel
print("✓ BaseModel import OK")

# Add global imports that might be missing
from typing import Optional, List, Dict, Any, Union, TypeVar, Tuple

try:
    # Try to import each v1 API router individually to identify the issue
    print("Testing API v1 routers individually:")
    
    print("Testing issues API...", end="")
    from app.routers.api.v1 import issues
    print(" ✓")
    
    print("Testing events API...", end="")
    from app.routers.api.v1 import events
    print(" ✓")
    
    print("Testing analytics API...", end="")
    from app.routers.api.v1 import analytics
    print(" ✓")
    
    print("Testing external_apis API...", end="")
    from app.routers.api.v1 import external_apis
    print(" ✓")
    
    print("Testing memory_leak API...", end="")
    from app.routers.api.v1 import memory_leak
    print(" ✓")
    
    print("Testing n_plus_one API...", end="")
    from app.routers.api.v1 import n_plus_one
    print(" ✓")
    
    print("Testing alert_health API...", end="")
    from app.routers.api.v1 import alert_health
    print(" ✓")
    
    # Now try to setup the router
    print("\nTesting setup_api_v1_router...")
    from app.routers.api import setup_api_v1_router
    from app.core.config import get_settings
    from fastapi import FastAPI
    
    settings = get_settings()
    app = FastAPI()
    setup_api_v1_router(app, settings)
    print("✓ API v1 router setup successful")
    
    # Try to setup all routers
    print("\nSetting up all routers...")
    from app.routers import setup_routers
    setup_routers(app, settings)
    print("✓ All routers setup successful")
    
except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()