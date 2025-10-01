#!/usr/bin/env python3
"""
Security Validation Tests
Tests to ensure all security fixes are working correctly
"""
import os
import sys
import asyncio
import httpx
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

# Set test environment variables
os.environ['SECRET_KEY'] = 'test-secret-key-at-least-32-characters-long-for-testing'
os.environ['CSRF_SECRET'] = 'test-csrf-secret-at-least-32-characters-long-for-testing'
os.environ['SENTRY_API_TOKEN'] = 'test-sentry-api-token-that-is-at-least-32-characters-long'

print("=" * 60)
print("SECURITY VALIDATION TESTS")
print("=" * 60)

# Test 1: Validate settings with secure secrets
print("\n1. Testing secure settings validation...")
try:
    from app.core.settings import settings
    print("✅ Settings loaded successfully")
    print(f"   - Secret key configured: {'✓' if hasattr(settings, 'secret_key') and settings.secret_key else '✗'}")
    print(f"   - CSRF secret configured: {'✓' if hasattr(settings, 'csrf_secret') and settings.csrf_secret else '✗'}")
    
    # Test validation with short key
    try:
        os.environ['SECRET_KEY'] = 'too-short'
        from importlib import reload
        import app.core.settings
        reload(app.core.settings)
        print("❌ Short secret key should have been rejected!")
    except Exception as e:
        print("✅ Short secret key properly rejected")
        os.environ['SECRET_KEY'] = 'test-secret-key-at-least-32-characters-long-for-testing'
        
except Exception as e:
    print(f"❌ Failed to load settings: {e}")
    sys.exit(1)

# Test 2: Validate JWT token generation
print("\n2. Testing JWT token generation...")
try:
    from app.routers.auth import create_access_token, create_refresh_token, verify_refresh_token
    
    # Create test tokens
    test_data = {"sub": "test-user", "org": "test-org"}
    access_token = create_access_token(test_data)
    refresh_token = create_refresh_token(test_data)
    
    print(f"✅ Access token created: {access_token[:20]}...")
    print(f"✅ Refresh token created: {refresh_token[:20]}...")
    
    # Verify refresh token
    payload = verify_refresh_token(refresh_token)
    print(f"✅ Refresh token verified: {payload.get('sub')}")
    
except Exception as e:
    print(f"❌ JWT token generation failed: {e}")

# Test 3: Validate CSRF middleware
print("\n3. Testing CSRF protection middleware...")
try:
    from app.middleware.csrf_protection import CSRFProtection, get_csrf_token
    from fastapi import Response
    
    # Test CSRF token generation
    csrf_protection = CSRFProtection()
    test_token = CSRFProtection.generate_csrf_token()
    print(f"✅ CSRF token generated: {test_token[:20]}...")
    print(f"✅ Token length: {len(test_token)} characters")
    
    # Test CSRF validation logic
    if csrf_protection._validate_tokens(test_token, test_token):
        print("✅ CSRF token validation working")
    else:
        print("❌ CSRF token validation failed")
        
except Exception as e:
    print(f"❌ CSRF protection failed: {e}")

# Test 4: Validate async file operations
print("\n4. Testing async file operations...")
async def test_async_io():
    try:
        import aiofiles
        import yaml
        import tempfile
        
        # Create test data
        test_config = {
            "name": "Test API",
            "base_url": "https://api.test.com",
            "auth": {"type": "none"}
        }
        
        # Write async
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as tmp:
            tmp_path = tmp.name
            
        async with aiofiles.open(tmp_path, 'w') as f:
            yaml_content = yaml.dump(test_config)
            await f.write(yaml_content)
        print("✅ Async write successful")
        
        # Read async
        async with aiofiles.open(tmp_path, 'r') as f:
            content = await f.read()
            loaded_config = yaml.safe_load(content)
        print("✅ Async read successful")
        print(f"   - Loaded config: {loaded_config['name']}")
        
        # Cleanup
        os.unlink(tmp_path)
        
    except Exception as e:
        print(f"❌ Async I/O failed: {e}")

# Run async test
asyncio.run(test_async_io())

# Test 5: Validate app can start
print("\n5. Testing FastAPI app initialization...")
try:
    from app.main import app
    from app.core.factory import create_app
    
    # Check if app has required middleware
    middleware_types = [type(m) for m in app.middleware]
    print("✅ App created successfully")
    print(f"   - Middlewares: {len(app.middleware)}")
    
    # Check routes
    route_count = len(app.routes)
    print(f"   - Routes registered: {route_count}")
    
    # Check CSRF endpoint exists
    csrf_route_exists = any(route.path == "/api/v1/auth/csrf-token" for route in app.routes)
    print(f"   - CSRF token endpoint: {'✓' if csrf_route_exists else '✗'}")
    
except Exception as e:
    print(f"❌ App initialization failed: {e}")

print("\n" + "=" * 60)
print("VALIDATION COMPLETE")
print("=" * 60)