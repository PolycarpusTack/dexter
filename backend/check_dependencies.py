"""
Check if all required dependencies and files for backend are present.
"""
import os
import sys
import importlib
from colorama import init, Fore, Style

# Initialize colorama for colored console output
init()

def print_success(message):
    """Print success message in green."""
    print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")

def print_warning(message):
    """Print warning message in yellow."""
    print(f"{Fore.YELLOW}⚠ {message}{Style.RESET_ALL}")

def print_error(message):
    """Print error message in red."""
    print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")

def print_info(message):
    """Print info message in blue."""
    print(f"{Fore.BLUE}ℹ {message}{Style.RESET_ALL}")

def print_header(message):
    """Print header in cyan."""
    print(f"\n{Fore.CYAN}== {message} =={Style.RESET_ALL}")

def check_module_installed(module_name):
    """Check if a Python module is installed."""
    try:
        importlib.import_module(module_name)
        print_success(f"Module '{module_name}' is installed")
        return True
    except ImportError:
        print_error(f"Module '{module_name}' is not installed")
        return False

def check_file_exists(file_path):
    """Check if a file exists."""
    if os.path.isfile(file_path):
        print_success(f"File exists: {file_path}")
        return True
    else:
        print_error(f"File missing: {file_path}")
        return False

def check_directory_exists(dir_path):
    """Check if a directory exists."""
    if os.path.isdir(dir_path):
        print_success(f"Directory exists: {dir_path}")
        return True
    else:
        print_error(f"Directory missing: {dir_path}")
        return False

def get_pydantic_version():
    """Get the installed Pydantic version."""
    try:
        import pydantic
        version = getattr(pydantic, "__version__", "unknown")
        major_version = int(version.split(".")[0])
        print_info(f"Detected Pydantic version: {version} (v{major_version})")
        return major_version
    except (ImportError, ValueError, IndexError):
        print_error("Pydantic is not installed or version cannot be determined")
        return 0

def check_environment_settings():
    """Check environment variables."""
    print_header("Checking environment settings")
    
    # Load .env file if python-dotenv is installed
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print_success("Loaded .env file")
    except ImportError:
        print_warning("python-dotenv not installed, skipping .env file loading")
    
    # Check required environment variables
    env_vars = {
        "SENTRY_API_TOKEN": os.environ.get("SENTRY_API_TOKEN"),
        "SENTRY_ORGANIZATION_SLUG": os.environ.get("SENTRY_ORGANIZATION_SLUG"),
        "SENTRY_PROJECT_SLUG": os.environ.get("SENTRY_PROJECT_SLUG"),
        "REDIS_URL": os.environ.get("REDIS_URL"),
        "OLLAMA_BASE_URL": os.environ.get("OLLAMA_BASE_URL"),
        "OLLAMA_MODEL": os.environ.get("OLLAMA_MODEL")
    }
    
    for name, value in env_vars.items():
        if value:
            if name == "SENTRY_API_TOKEN":
                # Don't print the actual token
                print_success(f"Environment variable {name} is set")
            else:
                print_success(f"Environment variable {name} is set to '{value}'")
        else:
            print_warning(f"Environment variable {name} is not set")

def main():
    """Main function."""
    print_header("Dependency Check for Dexter Backend")
    
    # Check Python version
    python_version = sys.version.split()[0]
    print_info(f"Python version: {python_version}")
    
    # Check required modules
    print_header("Checking required modules")
    modules = [
        "fastapi", "uvicorn", "pydantic", "httpx", 
        "redis", "aiofiles", "pytest", "pytest_asyncio"
    ]
    
    for module in modules:
        check_module_installed(module)
    
    # Check Pydantic version
    pydantic_version = get_pydantic_version()
    if pydantic_version >= 2:
        print_info("You are using Pydantic v2+. Make sure to use 'pattern' instead of 'regex' in Field validators.")
    
    # Check required directories
    print_header("Checking required directories")
    directories = [
        "./app",
        "./app/core",
        "./app/models",
        "./app/routers",
        "./app/services"
    ]
    
    for directory in directories:
        check_directory_exists(directory)
    
    # Check critical files
    print_header("Checking critical files")
    files = [
        "./app/__init__.py",
        "./app/main.py",
        "./app/core/settings.py",
        "./app/core/config.py",
        "./app/services/cache_service.py",
        "./app/routers/__init__.py"
    ]
    
    for file in files:
        check_file_exists(file)
    
    # Check environment settings
    check_environment_settings()
    
    print_header("Check completed")
    print_info("If there are missing dependencies, run: pip install -r requirements.txt")
    print_info("If there are missing files, run: python fix_missing_files.py")

if __name__ == "__main__":
    main()
