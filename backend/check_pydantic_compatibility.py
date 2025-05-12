"""
Utility script to check for Pydantic compatibility issues.
Scans Python files for deprecated Pydantic features.
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
        print(f"Detected Pydantic version: {version}")
        return version
    except ImportError:
        print("Pydantic is not installed.")
        return "not installed"

def scan_file_for_deprecated_features(file_path):
    """Scan a file for deprecated Pydantic features."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    issues = []
    
    # Check for regex instead of pattern
    regex_pattern = r'Field\s*\(\s*.*?\bregex\s*='
    regex_matches = re.findall(regex_pattern, content)
    if regex_matches:
        issues.append(f"Found {len(regex_matches)} uses of deprecated 'regex' parameter. Use 'pattern' instead in Pydantic v2+")
    
    # Check for schema_extra instead of json_schema_extra
    schema_extra_pattern = r'schema_extra\s*='
    schema_extra_matches = re.findall(schema_extra_pattern, content)
    if schema_extra_matches:
        issues.append(f"Found {len(schema_extra_matches)} uses of 'schema_extra'. Use 'json_schema_extra' instead in Pydantic v2+")
    
    # Check for validator without mode parameter
    validator_pattern = r'@validator\s*\('
    validator_matches = re.findall(validator_pattern, content)
    if validator_matches:
        issues.append(f"Found {len(validator_matches)} uses of '@validator'. In Pydantic v2, consider using '@field_validator' instead")
    
    return issues

def scan_directory(directory_path):
    """Scan all Python files in a directory for Pydantic compatibility issues."""
    issues_found = False
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                issues = scan_file_for_deprecated_features(file_path)
                if issues:
                    issues_found = True
                    relative_path = os.path.relpath(file_path, directory_path)
                    print(f"\n{relative_path}:")
                    for issue in issues:
                        print(f"  - {issue}")
    
    return issues_found

def main():
    """Main function."""
    print("Pydantic Compatibility Checker")
    print("===========================")
    
    # Get Pydantic version
    version = get_pydantic_version()
    
    # Determine the directory to scan
    if len(sys.argv) > 1:
        directory = sys.argv[1]
    else:
        directory = os.path.dirname(os.path.abspath(__file__))
    
    print(f"\nScanning directory: {directory}")
    
    # Scan the directory
    issues_found = scan_directory(directory)
    
    if issues_found:
        print("\nFound Pydantic compatibility issues. Please fix them for Pydantic v2 compatibility.")
        print("\nRecommendations:")
        print("  - Replace 'regex' with 'pattern' in Field()")
        print("  - Replace 'schema_extra' with 'json_schema_extra'")
        print("  - Replace '@validator' with '@field_validator'")
    else:
        print("\nNo Pydantic compatibility issues found!")

if __name__ == "__main__":
    main()
