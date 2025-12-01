"""
Fix for FastAPI compatibility with Python 3.13

This script fixes the issue with parameter name conflict in fastapi.params.Body.__init__
by patching the FastAPI library to avoid multiple values for keyword argument 'json_json_json_json_schema_extra'.

Run this script from the project root:
    python fix_fastapi_py313.py
"""

import os
import sys
import re
import importlib.util
from pathlib import Path

def find_fastapi_path():
    """Find where FastAPI is installed in the Python environment."""
    try:
        spec = importlib.util.find_spec('fastapi')
        if spec is None:
            print("FastAPI is not installed in this environment.")
            return None
        return Path(spec.origin).parent
    except (ImportError, AttributeError) as e:
        print(f"Error finding FastAPI: {e}")
        return None

def backup_file(file_path):
    """Create a backup of the file."""
    backup_path = f"{file_path}.bak"
    if not os.path.exists(backup_path):
        import shutil
        shutil.copy2(file_path, backup_path)
        print(f"Created backup: {backup_path}")
    return backup_path

def fix_params_py(fastapi_path):
    """Fix the params.py file in the FastAPI library."""
    params_file = fastapi_path / "params.py"
    if not os.path.exists(params_file):
        print(f"Could not find params.py at {params_file}")
        return False
    
    # Create backup
    backup_file(params_file)
    
    # Read the file
    with open(params_file, 'r') as f:
        content = f.read()
    
    # Pattern to find and fix the problem with multiple json_schema_extra parameters
    pattern = r'json_json_json_json_schema_extra'
    replacement = r'json_schema_extra'
    
    # Apply the fix
    if pattern in content:
        new_content = content.replace(pattern, replacement)
        
        # Write the patched file
        with open(params_file, 'w') as f:
            f.write(new_content)
        
        print(f"Fixed FastAPI params.py file at {params_file}")
        return True
    else:
        print(f"Could not find the problematic pattern in {params_file}")
        return False

def fix_fastapi_python313():
    """Main function to fix FastAPI compatibility with Python 3.13."""
    print("FastAPI Python 3.13 Compatibility Fixer")
    print("======================================")
    
    # Check Python version
    python_version = sys.version_info
    print(f"Running on Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Find FastAPI installation
    fastapi_path = find_fastapi_path()
    if not fastapi_path:
        return False
    
    print(f"Found FastAPI at: {fastapi_path}")
    
    # Fix params.py
    success = fix_params_py(fastapi_path)
    
    if success:
        print("\nFix completed successfully!")
        print("\nRestart your application to apply the changes.")
    else:
        print("\nFix not applied. No changes were made.")
    
    return success

if __name__ == "__main__":
    fix_fastapi_python313()