"""
Direct fix for pydantic-settings RootModel import error with Windows paths.
This script directly modifies the problem files in the virtual environment.
"""

import os
import sys
import re
from pathlib import Path

def find_file_in_venv(filename, venv_path="venv"):
    """Find a file in the virtual environment by walking the directory."""
    for root, dirs, files in os.walk(venv_path):
        if filename in files:
            return os.path.join(root, filename)
    return None

def fix_utils_py():
    """Find and fix the utils.py file in pydantic_settings package."""
    # Try to locate the utils.py file
    utils_paths = [
        r"venv\Lib\site-packages\pydantic_settings\sources\utils.py",  # Standard Windows path
        "venv/Lib/site-packages/pydantic_settings/sources/utils.py",   # Forward slash version
    ]
    
    utils_file = None
    for path in utils_paths:
        if os.path.exists(path):
            utils_file = path
            break
    
    # If not found directly, try searching
    if not utils_file:
        utils_file = find_file_in_venv("utils.py")
        # Check if it's the right utils.py (in pydantic_settings)
        if utils_file and "pydantic_settings" not in utils_file:
            utils_file = None
    
    if not utils_file:
        print("ERROR: Could not find pydantic_settings utils.py file")
        return False
    
    print(f"Found utils.py at: {utils_file}")
    
    # Create backup
    backup_file = f"{utils_file}.bak"
    if not os.path.exists(backup_file):
        import shutil
        shutil.copy2(utils_file, backup_file)
        print(f"Created backup at: {backup_file}")
    
    # Read the file
    with open(utils_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if the RootModel import exists
    if "RootModel" in content:
        # Replace the problematic import
        new_content = re.sub(
            r"from pydantic import (.*?)RootModel(.*?)",
            r"from pydantic import \1\2\n# Fixed RootModel import\ntry:\n    from pydantic import RootModel\nexcept ImportError:\n    # Create a compatibility RootModel\n    from typing import Any, TypeVar, Generic\n    T = TypeVar('T')\n    class RootModel(BaseModel, Generic[T]):\n        root: T\n        def __init__(self, root: T, **data: Any) -> None:\n            super().__init__(root=root, **data)",
            content
        )
        
        # Write the fixed content
        with open(utils_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ Successfully fixed {utils_file}")
        return True
    else:
        print(f"No RootModel import found in {utils_file}")
        return False

def install_older_pydantic_settings():
    """Install an older version of pydantic-settings known to work."""
    print("Installing compatible pydantic-settings version...")
    
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "pydantic-settings==1.2.5"], 
            check=True, 
            capture_output=True, 
            text=True
        )
        print("✅ Successfully installed pydantic-settings==1.2.5")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install pydantic-settings: {e}")
        print(e.stderr)
        return False

def main():
    """Main function to fix pydantic-settings RootModel import error."""
    print("Running direct fix for pydantic-settings RootModel import error")
    print("==============================================================")
    
    # First try installing the compatible version
    install_result = install_older_pydantic_settings()
    
    # Then try to fix the file directly in case the install didn't solve it
    fix_result = fix_utils_py()
    
    if install_result or fix_result:
        print("\n✅ Fix completed successfully!")
        print("You can now run the application.")
    else:
        print("\n❌ Failed to apply any fixes.")
        print("Please try manually reinstalling pydantic-settings==1.2.5")

if __name__ == "__main__":
    main()