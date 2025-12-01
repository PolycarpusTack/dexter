"""
Fix for pydantic-settings compatibility with Pydantic versions

This script addresses the 'ImportError: cannot import name 'RootModel' from 'pydantic''
error when using pydantic-settings with incompatible Pydantic versions.
"""

import os
import sys
import subprocess
import importlib.util
from pathlib import Path

def get_pydantic_version():
    """Get the installed Pydantic version."""
    try:
        import pydantic
        version = getattr(pydantic, "__version__", "unknown")
        print(f"Detected Pydantic version: {version}")
        return version
    except ImportError:
        print("Pydantic is not installed.")
        return "not installed"

def find_pydantic_settings_path():
    """Find where pydantic-settings is installed in the Python environment."""
    try:
        spec = importlib.util.find_spec('pydantic_settings')
        if spec is None:
            print("pydantic-settings is not installed in this environment.")
            return None
        return Path(spec.origin).parent
    except (ImportError, AttributeError) as e:
        print(f"Error finding pydantic-settings: {e}")
        return None

def fix_pydantic_settings(pydantic_settings_path):
    """Fix the pydantic-settings for compatibility with different Pydantic versions."""
    
    # Find the utils.py file that contains the problematic import
    utils_file = pydantic_settings_path / "sources" / "utils.py"
    
    if not os.path.exists(utils_file):
        print(f"Could not find utils.py at {utils_file}")
        return False
    
    # Backup the file
    backup_file = f"{utils_file}.bak"
    if not os.path.exists(backup_file):
        import shutil
        shutil.copy2(utils_file, backup_file)
        print(f"Created backup: {backup_file}")
    
    # Read the file
    with open(utils_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if the problematic import exists
    if "from pydantic import BaseModel, Json, RootModel, Secret" in content:
        # Replace the problematic import with a version-conditional import
        new_content = content.replace(
            "from pydantic import BaseModel, Json, RootModel, Secret",
            """from pydantic import BaseModel, Json, Secret
# Handle RootModel which is not available in all Pydantic versions
try:
    from pydantic import RootModel
except ImportError:
    # Create a compatibility version of RootModel
    from typing import Any, TypeVar, Generic
    T = TypeVar('T')
    class RootModel(BaseModel, Generic[T]):
        root: T
        def __init__(self, root: T, **data: Any) -> None:
            super().__init__(root=root, **data)"""
        )
        
        # Write the patched file
        with open(utils_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"Fixed pydantic-settings utils.py file at {utils_file}")
        return True
    else:
        print(f"Could not find the problematic import in {utils_file}")
        return False

def get_compatible_pydantic_settings_version(pydantic_version):
    """Determine which pydantic-settings version is compatible with the installed Pydantic version."""
    
    major, minor, patch = [int(x) for x in pydantic_version.split(".")[:3]]
    
    if major == 2:
        if minor >= 5:
            return "2.1.0"  # For Pydantic 2.5.x and newer
        elif minor >= 3:
            return "2.0.3"  # For Pydantic 2.3.x and 2.4.x
        else:
            return "1.2.5"  # For older Pydantic 2.x
    else:
        return "1.2.5"  # For Pydantic 1.x

def install_compatible_version(pydantic_version):
    """Install a compatible version of pydantic-settings."""
    
    compatible_version = get_compatible_pydantic_settings_version(pydantic_version)
    print(f"Installing pydantic-settings=={compatible_version} for compatibility with Pydantic {pydantic_version}")
    
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", f"pydantic-settings=={compatible_version}"], 
            check=True, 
            capture_output=True, 
            text=True
        )
        print("Installation successful!")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Installation failed: {e}")
        print(e.stderr)
        return False

def fix_pydantic_settings_compatibility():
    """Main function to fix pydantic-settings compatibility issues."""
    print("Pydantic-Settings Compatibility Fixer")
    print("=====================================")
    
    # Get Pydantic version
    pydantic_version = get_pydantic_version()
    
    # Try installing a compatible version first
    if pydantic_version != "not installed":
        if install_compatible_version(pydantic_version):
            print("Fixed by installing a compatible version.")
            return True
    
    # If installation failed or we still need patches, apply them
    pydantic_settings_path = find_pydantic_settings_path()
    if not pydantic_settings_path:
        return False
    
    print(f"Found pydantic-settings at: {pydantic_settings_path}")
    
    # Fix the utils.py file
    success = fix_pydantic_settings(pydantic_settings_path)
    
    if success:
        print("\nFix completed successfully!")
        print("\nRestart your application to apply the changes.")
    else:
        print("\nFix not applied. No changes were made.")
    
    return success

if __name__ == "__main__":
    fix_pydantic_settings_compatibility()