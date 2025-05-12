"""
Test coverage for the new architecture migration.

This script checks if the migration is complete and comprehensive.
"""
import os
import sys
import importlib
import inspect
import logging
from typing import Dict, List, Set, Tuple, Any

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Application modes to test
MODES = ["default", "debug", "minimal", "enhanced", "simplified"]

def check_yaml_configs() -> Tuple[bool, List[str]]:
    """Check if all required YAML configurations exist."""
    required_files = ["base.yaml"] + [f"{mode}.yaml" for mode in MODES]
    missing_files = []
    
    for file in required_files:
        config_path = os.path.join("config", file)
        if not os.path.exists(config_path):
            missing_files.append(config_path)
    
    return len(missing_files) == 0, missing_files

def check_core_modules() -> Tuple[bool, List[str]]:
    """Check if all required core modules exist and can be imported."""
    required_modules = [
        "app.core.config", 
        "app.core.factory", 
        "app.core.logging", 
        "app.core.middleware",
        "app.core.compatibility"
    ]
    missing_modules = []
    
    for module_name in required_modules:
        try:
            importlib.import_module(module_name)
        except ImportError as e:
            missing_modules.append(f"{module_name}: {e}")
    
    return len(missing_modules) == 0, missing_modules

def check_main_files() -> Tuple[bool, Dict[str, str]]:
    """Check if all main files exist and properly redirect to the new architecture."""
    main_files = {
        "app.main": "Main entry point",
        "app.main_debug": "Debug mode shim",
        "app.main_minimal": "Minimal mode shim",
        "app.main_enhanced": "Enhanced mode shim",
        "app.main_simplified": "Simplified mode shim"
    }
    issues = {}
    
    for module_name, description in main_files.items():
        try:
            module = importlib.import_module(module_name)
            
            # Check if app is exported
            if not hasattr(module, "app"):
                issues[module_name] = f"No 'app' variable exported"
                
            # Check if the main file has the correct pattern (for shims)
            if module_name != "app.main":
                source = inspect.getsource(module)
                if "deprecated" not in source.lower() or "app.main" not in source:
                    issues[module_name] = f"Not properly redirecting to main.py"
        except ImportError as e:
            issues[module_name] = f"Import error: {e}"
    
    return len(issues) == 0, issues

def check_batch_files() -> Tuple[bool, Dict[str, str]]:
    """Check if batch files have been updated to use the new architecture."""
    batch_files = [
        "run.py",
        "runserver.bat",
        "run_minimal.bat",
        "run_simplified.bat",
        "start_dev_server.bat"
    ]
    issues = {}
    
    for file in batch_files:
        if not os.path.exists(file):
            issues[file] = "File not found"
            continue
            
        try:
            with open(file, 'r') as f:
                content = f.read().lower()
                
            # Check for environment variable setting
            has_app_mode = "app_mode" in content
            
            # For .py files, check for specific patterns
            if file.endswith('.py'):
                if not has_app_mode and "main_" in content:
                    issues[file] = "Still using old main_* files directly"
            
            # For .bat files, check for environment variable setting
            if file.endswith('.bat'):
                if not has_app_mode and "main_" in content:
                    issues[file] = "Not using APP_MODE environment variable"
        except Exception as e:
            issues[file] = f"Error reading file: {e}"
    
    return len(issues) == 0, issues

def check_documentation() -> Tuple[bool, List[str]]:
    """Check if all required documentation files exist."""
    required_docs = [
        "MIGRATION_GUIDE.md",
        "README_MIGRATION.md",
        "ADOPTION_STRATEGY.md",
        "QUICK_REFERENCE.md"
    ]
    missing_docs = []
    
    for doc in required_docs:
        if not os.path.exists(doc):
            missing_docs.append(doc)
    
    return len(missing_docs) == 0, missing_docs

def run_migration_tests() -> bool:
    """Run all migration tests and report results."""
    all_passed = True
    
    # Test YAML configurations
    logger.info("Checking YAML configurations...")
    passed, missing_files = check_yaml_configs()
    if not passed:
        all_passed = False
        logger.error(f"Missing YAML configuration files: {', '.join(missing_files)}")
    else:
        logger.info("✅ All YAML configuration files present")
    
    # Test core modules
    logger.info("Checking core modules...")
    passed, missing_modules = check_core_modules()
    if not passed:
        all_passed = False
        logger.error("Missing or error importing core modules:")
        for module in missing_modules:
            logger.error(f"  - {module}")
    else:
        logger.info("✅ All core modules importable")
    
    # Test main files
    logger.info("Checking main files...")
    passed, issues = check_main_files()
    if not passed:
        all_passed = False
        logger.error("Issues with main files:")
        for file, issue in issues.items():
            logger.error(f"  - {file}: {issue}")
    else:
        logger.info("✅ All main files correctly implemented")
    
    # Test batch files
    logger.info("Checking batch files...")
    passed, issues = check_batch_files()
    if not passed:
        all_passed = False
        logger.error("Issues with batch files:")
        for file, issue in issues.items():
            logger.error(f"  - {file}: {issue}")
    else:
        logger.info("✅ All batch files updated")
    
    # Test documentation
    logger.info("Checking documentation...")
    passed, missing_docs = check_documentation()
    if not passed:
        all_passed = False
        logger.error(f"Missing documentation files: {', '.join(missing_docs)}")
    else:
        logger.info("✅ All documentation files present")
    
    # Report overall status
    if all_passed:
        logger.info("🎉 All migration tests passed! The migration appears complete.")
    else:
        logger.warning("⚠️ Some migration tests failed. See above for details.")
    
    return all_passed

if __name__ == "__main__":
    success = run_migration_tests()
    sys.exit(0 if success else 1)
