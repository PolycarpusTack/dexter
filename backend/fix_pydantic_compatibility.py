"""
Utility script to fix common Pydantic compatibility issues.
Automatically updates files to be compatible with Pydantic v2.
"""

import os
import re
import sys
from pathlib import Path
import importlib

def get_pydantic_version():
    """Get the installed Pydantic version."""
    try:
        import pydantic
        version = getattr(pydantic, "__version__", "unknown")
        major_version = int(version.split(".")[0])
        print(f"Detected Pydantic version: {version} (v{major_version})")
        return major_version
    except (ImportError, ValueError, IndexError):
        print("Pydantic is not installed or version cannot be determined.")
        return 0

def fix_file_for_pydantic_v2(file_path, dry_run=False):
    """Fix a file for Pydantic v2 compatibility."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Replace regex with pattern
    regex_pattern = r'Field\s*\(\s*(.*?)\bregex\s*=([^,\)]+)'
    replacement = r'Field(\1pattern=\2'
    new_content, regex_count = re.subn(regex_pattern, replacement, content)
    if regex_count > 0:
        modified = True
        content = new_content
        print(f"  - Replaced {regex_count} instances of 'regex' with 'pattern'")
    
    # Replace schema_extra with json_schema_extra
    schema_extra_pattern = r'schema_extra\s*='
    replacement = r'json_json_json_json_schema_extra='
    new_content, schema_extra_count = re.subn(schema_extra_pattern, replacement, content)
    if schema_extra_count > 0:
        modified = True
        content = new_content
        print(f"  - Replaced {schema_extra_count} instances of 'schema_extra' with 'json_schema_extra'")
    
    # Add version-aware field validation if needed
    if regex_count > 0 and 'pattern_field' not in content:
        # Define pattern_field function if using regex
        pattern_field_def = '''
# Helper function to handle Field validation based on Pydantic version
def get_pydantic_version():
    try:
        import pydantic
        version = getattr(pydantic, "__version__", "1.0.0")
        major_version = int(version.split(".")[0])
        return major_version
    except (ImportError, ValueError, IndexError):
        return 1  # Default to v1 if we can't determine version

PYDANTIC_V2 = get_pydantic_version() >= 2

def pattern_field(pattern, **kwargs):
    if PYDANTIC_V2:
        return Field(pattern=pattern, **kwargs)
    else:
        return Field(pattern=pattern, **kwargs)
'''
        # Find import section
        import_section_end = content.find("\n\n", content.find("from pydantic import"))
        if import_section_end == -1:
            import_section_end = content.find("\n", content.find("from pydantic import"))
        
        if import_section_end != -1:
            new_content = content[:import_section_end] + pattern_field_def + content[import_section_end:]
            modified = True
            print(f"  - Added version-aware pattern_field function")
            content = new_content
    
    # Write changes to file if modified and not in dry run mode
    if modified and not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  - Changes written to {file_path}")
    
    return modified

def scan_and_fix_directory(directory_path, dry_run=False):
    """Scan all Python files in a directory and fix Pydantic compatibility issues."""
    fixed_files = []
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, directory_path)
                print(f"\nChecking {relative_path}:")
                if fix_file_for_pydantic_v2(file_path, dry_run):
                    fixed_files.append(relative_path)
    
    return fixed_files

def main():
    """Main function."""
    print("Pydantic Compatibility Fixer")
    print("==========================")
    
    # Get Pydantic version
    version = get_pydantic_version()
    
    # Check if we should run in dry run mode
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("\nRunning in dry-run mode (no changes will be written)")
    
    # Determine the directory to scan
    directory = next((arg for arg in sys.argv[1:] if not arg.startswith("--")), None)
    if not directory:
        directory = os.path.dirname(os.path.abspath(__file__))
    
    print(f"\nScanning and fixing directory: {directory}")
    
    # Scan and fix the directory
    fixed_files = scan_and_fix_directory(directory, dry_run)
    
    if fixed_files:
        print(f"\nFixed {len(fixed_files)} files for Pydantic v2 compatibility.")
        if dry_run:
            print("\nThis was a dry run. Run without --dry-run to apply changes.")
    else:
        print("\nNo files needed fixing for Pydantic v2 compatibility!")

if __name__ == "__main__":
    main()
