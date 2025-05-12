"""
Repair and diagnosis tool for Dexter backend.
This script will automatically create any missing essential files
and help diagnose issues in the project structure.
"""

import os
import importlib
import inspect
import sys
from typing import List, Dict, Any, Optional, Set

# Try to import colorama for prettier output
try:
    from colorama import init, Fore, Style
    init()
    
    def print_success(message):
        print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")
        
    def print_warning(message):
        print(f"{Fore.YELLOW}⚠ {message}{Style.RESET_ALL}")
        
    def print_error(message):
        print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")
        
    def print_info(message):
        print(f"{Fore.BLUE}ℹ {message}{Style.RESET_ALL}")
        
    def print_header(message):
        print(f"\n{Fore.CYAN}== {message} =={Style.RESET_ALL}")
except ImportError:
    # Fall back to plain text if colorama is not installed
    def print_success(message):
        print(f"[OK] {message}")
        
    def print_warning(message):
        print(f"[WARNING] {message}")
        
    def print_error(message):
        print(f"[ERROR] {message}")
        
    def print_info(message):
        print(f"[INFO] {message}")
        
    def print_header(message):
        print(f"\n== {message} ==")

# Essential directories that should exist
ESSENTIAL_DIRS = [
    "./app",
    "./app/core",
    "./app/models",
    "./app/routers",
    "./app/services",
]

# Essential files that should exist
ESSENTIAL_FILES = [
    "./app/__init__.py",
    "./app/main.py",
    "./app/core/__init__.py",
    "./app/core/settings.py",
    "./app/core/config.py",
    "./app/models/__init__.py",
    "./app/models/auth.py",
    "./app/routers/__init__.py",
    "./app/services/__init__.py",
    "./app/services/cache_service.py",
    "./app/services/sentry_client.py",
]

# Templates for creating missing files
FILE_TEMPLATES = {
    "./app/__init__.py": """\"\"\"
Dexter backend API package initialization.
\"\"\"

__version__ = "0.1.0"
""",
    
    "./app/core/__init__.py": """\"\"\"
Core module initialization.
\"\"\"
""",
    
    "./app/models/__init__.py": """\"\"\"
Models module initialization.
\"\"\"
""",
    
    "./app/services/__init__.py": """\"\"\"
Services module initialization.
\"\"\"
""",
}

def check_directory_exists(dir_path: str) -> bool:
    """Check if a directory exists and create it if it doesn't."""
    if os.path.isdir(dir_path):
        print_success(f"Directory exists: {dir_path}")
        return True
    else:
        print_warning(f"Directory missing: {dir_path}")
        try:
            os.makedirs(dir_path, exist_ok=True)
            print_success(f"Created directory: {dir_path}")
            return True
        except Exception as e:
            print_error(f"Failed to create directory {dir_path}: {e}")
            return False

def check_file_exists(file_path: str) -> bool:
    """Check if a file exists."""
    if os.path.isfile(file_path):
        print_success(f"File exists: {file_path}")
        return True
    else:
        print_warning(f"File missing: {file_path}")
        # If there's a template, create the file
        if file_path in FILE_TEMPLATES:
            try:
                with open(file_path, 'w') as f:
                    f.write(FILE_TEMPLATES[file_path])
                print_success(f"Created file using template: {file_path}")
                return True
            except Exception as e:
                print_error(f"Failed to create file {file_path}: {e}")
                return False
        return False

def check_import(module_name: str) -> bool:
    """Check if a module can be imported."""
    try:
        module = importlib.import_module(module_name)
        print_success(f"Successfully imported: {module_name}")
        return True
    except ImportError as e:
        print_error(f"Failed to import: {module_name} - {e}")
        return False

def find_missing_dependencies(code_file: str) -> Set[str]:
    """Find missing dependencies in a Python file."""
    missing = set()
    try:
        with open(code_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        import_lines = []
        for line in content.split('\n'):
            if line.startswith('import ') or line.startswith('from '):
                import_lines.append(line)
        
        for line in import_lines:
            # Extract the base module name
            if line.startswith('import '):
                module = line[7:].split(' ')[0].split('.')[0]
            else:  # from ... import ...
                module = line[5:].split(' ')[0].split('.')[0]
            
            if module not in ('app', 'typing', '__future__'):
                try:
                    importlib.import_module(module)
                except ImportError:
                    missing.add(module)
    except Exception as e:
        print_error(f"Error analyzing {code_file}: {e}")
    
    return missing

def analyze_project_imports() -> Dict[str, Set[str]]:
    """Analyze all Python files in the project to find missing imports."""
    print_header("Analyzing project imports")
    
    missing_by_file = {}
    for root, _, files in os.walk('./app'):
        for filename in files:
            if filename.endswith('.py'):
                filepath = os.path.join(root, filename)
                missing = find_missing_dependencies(filepath)
                if missing:
                    missing_by_file[filepath] = missing
    
    return missing_by_file

def create_pip_requirements() -> None:
    """Create a requirements.txt file based on analyzed imports."""
    print_header("Creating requirements.txt from analysis")
    
    # Common package mappings (module name -> pip package name)
    PACKAGE_MAPPINGS = {
        'fastapi': 'fastapi',
        'pydantic': 'pydantic',
        'uvicorn': 'uvicorn[standard]',
        'httpx': 'httpx',
        'redis': 'redis',
        'dotenv': 'python-dotenv',
        'yaml': 'pyyaml',
        'jwt': 'pyjwt',
        'pytest': 'pytest',
        'pytest_asyncio': 'pytest-asyncio',
        'starlette': 'starlette',
        'email_validator': 'email-validator',
        'colorama': 'colorama',
    }
    
    # Get all missing dependencies
    all_missing = set()
    missing_by_file = analyze_project_imports()
    for missing in missing_by_file.values():
        all_missing.update(missing)
    
    # Create requirements.txt
    with open('requirements.txt', 'w') as f:
        f.write("# Automatically generated requirements.txt\n")
        f.write("# Generated by repair_project.py\n\n")
        
        for module in all_missing:
            package = PACKAGE_MAPPINGS.get(module, module)
            f.write(f"{package}\n")
        
        # Add basic requirements for a FastAPI project
        f.write("\n# Base requirements for FastAPI\n")
        f.write("fastapi>=0.111.0\n")
        f.write("uvicorn[standard]>=0.29.0\n")
        f.write("pydantic>=2.7.1\n")
        f.write("pydantic-settings>=2.2.1\n")
        f.write("httpx>=0.27.0\n")
        
        # Add Redis for cache service
        f.write("\n# Cache service\n")
        f.write("redis>=5.0.1\n")
        
        # Add testing libraries
        f.write("\n# Testing\n")
        f.write("pytest>=7.4.0\n")
        f.write("pytest-asyncio>=0.21.0\n")
    
    print_success(f"Created requirements.txt with {len(all_missing)} detected dependencies")

def main() -> None:
    """Main function."""
    print_header("Dexter Backend Repair Tool")
    
    # Check directories
    print_header("Checking directories")
    for directory in ESSENTIAL_DIRS:
        check_directory_exists(directory)
    
    # Check files
    print_header("Checking essential files")
    for file_path in ESSENTIAL_FILES:
        check_file_exists(file_path)
    
    # Create requirements.txt
    create_pip_requirements()
    
    # Summarize
    print_header("Repair summary")
    print_info("The basic project structure has been repaired.")
    print_info("Run 'pip install -r requirements.txt' to install required dependencies.")
    print_info("Then try running the simplified version with 'run_simplified.bat'")

if __name__ == "__main__":
    main()
