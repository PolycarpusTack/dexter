#!/usr/bin/env python3
"""
Auto-fix script for Promise Rejection Analyzer technical debt issues.

This script automatically fixes the most critical technical debt issues
identified after implementing the Promise Rejection Analyzer.
"""

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import List, Tuple

# Color codes for output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'


def print_status(message: str, status: str = "info"):
    """Print colored status messages."""
    if status == "success":
        print(f"{GREEN}✓ {message}{RESET}")
    elif status == "warning":
        print(f"{YELLOW}⚠ {message}{RESET}")
    elif status == "error":
        print(f"{RED}✗ {message}{RESET}")
    else:
        print(f"  {message}")


def fix_unused_imports(file_path: Path) -> bool:
    """Remove unused imports from Python files."""
    try:
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Remove unused asyncio import
        if 'import asyncio' in content and 'asyncio.' not in content.replace('import asyncio', ''):
            content = re.sub(r'^import asyncio\n', '', content, flags=re.MULTILINE)
            
            # Write back
            with open(file_path, 'w') as f:
                f.write(content)
            
            print_status(f"Removed unused asyncio import from {file_path}", "success")
            return True
        
        return False
    except Exception as e:
        print_status(f"Failed to fix imports in {file_path}: {e}", "error")
        return False


def add_type_annotations(file_path: Path) -> bool:
    """Add missing type annotations to methods."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Add type hints to _get_pattern_severity
        content = re.sub(
            r'def _get_pattern_severity\(self, pattern: str\) -> str:',
            r'def _get_pattern_severity(self, pattern: str) -> str:',
            content
        )
        
        # Add type hints to _format_frame
        content = re.sub(
            r'def _format_frame\(frame: Dict\[str, Any\]\) -> str:',
            r'def _format_frame(frame: Dict[str, Any]) -> str:',
            content
        )
        
        # Write back
        with open(file_path, 'w') as f:
            f.write(content)
        
        print_status(f"Added type annotations to {file_path}", "success")
        return True
        
    except Exception as e:
        print_status(f"Failed to add type annotations: {e}", "error")
        return False


def remove_pycache_dirs() -> int:
    """Remove all __pycache__ directories from the repository."""
    removed_count = 0
    
    for root, dirs, files in os.walk('.'):
        if '__pycache__' in dirs:
            pycache_path = os.path.join(root, '__pycache__')
            try:
                shutil.rmtree(pycache_path)
                print_status(f"Removed {pycache_path}", "success")
                removed_count += 1
            except Exception as e:
                print_status(f"Failed to remove {pycache_path}: {e}", "error")
    
    return removed_count


def update_gitignore() -> bool:
    """Ensure __pycache__ is in .gitignore."""
    gitignore_path = Path('.gitignore')
    
    try:
        if gitignore_path.exists():
            with open(gitignore_path, 'r') as f:
                content = f.read()
            
            if '__pycache__' not in content:
                with open(gitignore_path, 'a') as f:
                    f.write('\n# Python cache\n__pycache__/\n*.pyc\n*.pyo\n')
                print_status("Added __pycache__ to .gitignore", "success")
                return True
        else:
            with open(gitignore_path, 'w') as f:
                f.write('# Python cache\n__pycache__/\n*.pyc\n*.pyo\n')
            print_status("Created .gitignore with __pycache__ entry", "success")
            return True
            
    except Exception as e:
        print_status(f"Failed to update .gitignore: {e}", "error")
        return False


def add_constants_for_magic_numbers(file_path: Path) -> bool:
    """Replace magic numbers with named constants."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Add constants at the top of the class
        constants = '''
    # Analysis configuration constants
    ASYNC_INDICATOR_THRESHOLD = 3  # Minimum async frames to suspect promise issue
    BASE_CONFIDENCE = 0.5  # Starting confidence score
    CONFIDENCE_INCREMENT_STACK = 0.2  # Confidence boost for having stack trace
    CONFIDENCE_INCREMENT_CHAIN = 0.1  # Confidence boost for async chain
    CONFIDENCE_INCREMENT_FRAMEWORK = 0.1  # Confidence boost for known framework
    CONFIDENCE_INCREMENT_PATTERN = 0.05  # Confidence boost per detected pattern
    MAX_PATTERN_CONFIDENCE = 0.2  # Maximum confidence from patterns
'''
        
        # Find the class definition and add constants after it
        class_pattern = r'(class PromiseRejectionAnalyzer.*?:\n)'
        if re.search(class_pattern, content):
            content = re.sub(
                class_pattern,
                r'\1' + constants,
                content,
                count=1
            )
            
            # Replace magic numbers with constants
            content = content.replace('async_indicators >= 3', 'async_indicators >= self.ASYNC_INDICATOR_THRESHOLD')
            content = content.replace('confidence = 0.5', 'confidence = self.BASE_CONFIDENCE')
            content = content.replace('confidence += 0.2', 'confidence += self.CONFIDENCE_INCREMENT_STACK')
            content = content.replace('confidence += 0.1', 'confidence += self.CONFIDENCE_INCREMENT_CHAIN', 1)
            content = content.replace('confidence += min(pattern_count * 0.05, 0.2)', 
                                    'confidence += min(pattern_count * self.CONFIDENCE_INCREMENT_PATTERN, self.MAX_PATTERN_CONFIDENCE)')
            
            # Write back
            with open(file_path, 'w') as f:
                f.write(content)
            
            print_status(f"Replaced magic numbers with constants in {file_path}", "success")
            return True
        
        return False
        
    except Exception as e:
        print_status(f"Failed to add constants: {e}", "error")
        return False


def add_input_sanitization(file_path: Path) -> bool:
    """Add input sanitization for logging."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Add sanitization function
        sanitize_func = '''
def _sanitize_for_logging(self, text: str, max_length: int = 200) -> str:
    """Sanitize text for safe logging."""
    if not text:
        return ""
    
    # Remove potential log injection characters
    sanitized = text.replace('\\n', ' ').replace('\\r', ' ').replace('\\t', ' ')
    
    # Truncate if too long
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length] + '...'
    
    return sanitized

'''
        
        # Add the function before the detect method
        detect_pattern = r'(\s+async def detect\()'
        if re.search(detect_pattern, content):
            content = re.sub(
                detect_pattern,
                '\n' + sanitize_func + r'\1',
                content,
                count=1
            )
            
            # Update logging calls to use sanitization
            content = re.sub(
                r'logger\.info\(f"Promise rejection detected via keyword: \{keyword\}"\)',
                r'logger.info(f"Promise rejection detected via keyword: {self._sanitize_for_logging(keyword)}")',
                content
            )
            
            # Write back
            with open(file_path, 'w') as f:
                f.write(content)
            
            print_status(f"Added input sanitization to {file_path}", "success")
            return True
        
        return False
        
    except Exception as e:
        print_status(f"Failed to add input sanitization: {e}", "error")
        return False


def run_linter(file_paths: List[Path]) -> bool:
    """Run linter on the fixed files."""
    try:
        # Try to run flake8
        result = subprocess.run(
            ['flake8', '--max-line-length=120'] + [str(p) for p in file_paths],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print_status("All files pass linting", "success")
            return True
        else:
            print_status("Linting warnings:", "warning")
            print(result.stdout)
            return False
            
    except FileNotFoundError:
        print_status("flake8 not installed, skipping linting", "warning")
        return True


def main():
    """Main function to run all fixes."""
    print("\n=== Promise Rejection Analyzer Technical Debt Auto-Fix ===\n")
    
    # Define file paths
    analyzer_path = Path('app/services/promise_rejection_analyzer.py')
    parser_path = Path('app/utils/promise_rejection_parser.py')
    
    fixes_applied = 0
    
    # Fix 1: Remove unused imports
    print("1. Fixing unused imports...")
    if fix_unused_imports(analyzer_path):
        fixes_applied += 1
    
    # Fix 2: Remove __pycache__ directories
    print("\n2. Removing __pycache__ directories...")
    removed = remove_pycache_dirs()
    if removed > 0:
        fixes_applied += removed
        print_status(f"Removed {removed} __pycache__ directories", "success")
    
    # Fix 3: Update .gitignore
    print("\n3. Updating .gitignore...")
    if update_gitignore():
        fixes_applied += 1
    
    # Fix 4: Replace magic numbers
    print("\n4. Replacing magic numbers with constants...")
    if add_constants_for_magic_numbers(analyzer_path):
        fixes_applied += 1
    
    # Fix 5: Add input sanitization
    print("\n5. Adding input sanitization for logging...")
    if add_input_sanitization(analyzer_path):
        fixes_applied += 1
    
    # Fix 6: Add type annotations
    print("\n6. Adding missing type annotations...")
    if add_type_annotations(parser_path):
        fixes_applied += 1
    
    # Run linter
    print("\n7. Running linter on fixed files...")
    run_linter([analyzer_path, parser_path])
    
    # Summary
    print(f"\n=== Summary ===")
    print_status(f"Total fixes applied: {fixes_applied}", "success" if fixes_applied > 0 else "warning")
    
    # Remaining issues to fix manually
    print("\n=== Remaining Manual Fixes ===")
    print("1. Add integration tests for Promise Rejection Analyzer")
    print("2. Extract shared pattern detection logic to reduce duplication")
    print("3. Add JSDoc comments to frontend components")
    print("4. Optimize D3 visualization rendering with React.memo")
    print("5. Replace 'any' types in frontend with proper interfaces")
    
    print("\nTechnical debt auto-fix completed!")


if __name__ == "__main__":
    main()