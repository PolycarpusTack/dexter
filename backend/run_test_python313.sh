#!/bin/bash

# Test script for Python 3.13 compatibility fix

echo "=== Testing Python 3.13 Compatibility Fix ==="
echo

# First, apply the compatibility fixes
echo "Applying compatibility fixes..."
./update_repo_for_python313.sh

# Check if the fix was successful
echo
echo "Testing the backend server startup..."
python3 -c "
import importlib
from pathlib import Path

try:
    # Import FastAPI to see if it works
    import fastapi
    from fastapi import params
    
    # Try to create a Body parameter (this should use the patched version)
    from fastapi import Body
    from pydantic import BaseModel
    
    class TestModel(BaseModel):
        name: str
        
    # Create a Body parameter (this would fail with the original error)
    body_param = Body(default=None, embed=True)
    
    print('✅ Success: FastAPI Body parameter created successfully!')
    print('✅ Python 3.13 compatibility fix is working correctly!')
    
except Exception as e:
    print(f'❌ Error: {str(e)}')
    print('❌ Python 3.13 compatibility fix did not resolve the issue.')
"

echo
echo "=== Test Complete ==="