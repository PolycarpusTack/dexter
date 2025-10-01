#!/usr/bin/env python3
"""
Validation script for C-1-T1 technical debt cleanup.

This script validates the state of the codebase before and after running the cleanup script.
It checks for the specific issues identified in the C-1-T1 technical debt report.

Usage:
    python scripts/validate-c1t1-cleanup.py [--after-cleanup]
"""

import os
import re
import ast
import sys
import argparse
from typing import List, Dict, Tuple, Set
from pathlib import Path
from collections import defaultdict


class C1T1Validator:
    """Validates the C-1-T1 technical debt issues."""
    
    def __init__(self):
        self.issues = defaultdict(list)
        self.stats = {
            'todo_docstrings': 0,
            'unused_imports': 0,
            'missing_type_hints': 0,
            'code_duplication': 0,
            'magic_values': 0,
            'empty_test_stubs': 0
        }
        
    def check_todo_docstrings(self, file_path: str) -> List[str]:
        """Check for TODO placeholder docstrings."""
        issues = []
        
        try:
            with open(file_path, 'r') as f:
                lines = f.readlines()
                
            for i, line in enumerate(lines):
                if 'TODO:' in line and ('docstring' in line or '"""' in line):
                    issues.append(f"Line {i+1}: {line.strip()}")
                    self.stats['todo_docstrings'] += 1
                    
        except Exception as e:
            print(f"Error checking {file_path}: {e}")
            
        return issues
        
    def check_unused_imports(self, file_path: str) -> List[str]:
        """Check for unused imports using AST analysis."""
        issues = []
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Skip __init__.py files with __all__ exports
            if file_path.endswith('__init__.py') and '__all__' in content:
                return issues
                
            tree = ast.parse(content)
            
            # Collect imports
            imports = {}
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        name = alias.asname or alias.name
                        imports[name] = node.lineno
                elif isinstance(node, ast.ImportFrom):
                    for alias in node.names:
                        name = alias.asname or alias.name
                        imports[name] = node.lineno
                        
            # Collect used names
            used_names = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.Name):
                    used_names.add(node.id)
                elif isinstance(node, ast.Attribute):
                    if isinstance(node.value, ast.Name):
                        used_names.add(node.value.id)
                        
            # Find unused imports
            for name, lineno in imports.items():
                if name not in used_names:
                    # Check if used in type annotations (simple check)
                    if f': {name}' not in content and f'-> {name}' not in content:
                        issues.append(f"Line {lineno}: Unused import '{name}'")
                        self.stats['unused_imports'] += 1
                        
        except Exception as e:
            print(f"Error analyzing imports in {file_path}: {e}")
            
        return issues
        
    def check_missing_type_hints(self, file_path: str) -> List[str]:
        """Check for functions missing type hints."""
        issues = []
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Skip special methods
                    if node.name.startswith('__') and node.name.endswith('__'):
                        continue
                        
                    # Check parameters
                    for arg in node.args.args:
                        if arg.arg != 'self' and arg.annotation is None:
                            issues.append(f"Function '{node.name}': parameter '{arg.arg}' missing type hint")
                            self.stats['missing_type_hints'] += 1
                            
                    # Check return type
                    if node.returns is None and node.name not in ['__init__']:
                        issues.append(f"Function '{node.name}': missing return type hint")
                        self.stats['missing_type_hints'] += 1
                        
        except Exception as e:
            print(f"Error checking type hints in {file_path}: {e}")
            
        return issues
        
    def check_code_duplication(self, file_path: str) -> List[str]:
        """Check for duplicate function definitions."""
        issues = []
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Count occurrences of function definitions
            func_counts = defaultdict(int)
            for match in re.finditer(r'def (\w+)\(', content):
                func_name = match.group(1)
                func_counts[func_name] += 1
                
            # Report duplicates
            for func_name, count in func_counts.items():
                if count > 1:
                    issues.append(f"Function '{func_name}' defined {count} times")
                    self.stats['code_duplication'] += count - 1
                    
        except Exception as e:
            print(f"Error checking duplication in {file_path}: {e}")
            
        return issues
        
    def check_magic_values(self, file_path: str) -> List[str]:
        """Check for hardcoded magic values."""
        issues = []
        
        try:
            with open(file_path, 'r') as f:
                lines = f.readlines()
                
            # Magic numbers to check
            magic_numbers = ['100000', '1000', '3600']
            
            for i, line in enumerate(lines):
                # Skip comments
                if line.strip().startswith('#'):
                    continue
                    
                # Check for magic numbers
                for magic in magic_numbers:
                    if magic in line and not any(const in line for const in ['ITERATIONS', 'SECONDS', 'MS_PER']):
                        issues.append(f"Line {i+1}: Magic value {magic}")
                        self.stats['magic_values'] += 1
                        
                # Check for hardcoded URLs in tests
                if 'test' in file_path.lower() and 'https://' in line:
                    if not any(const in line for const in ['TEST_URL', 'MOCK_URL']):
                        url_match = re.search(r'"(https://[^"]+)"', line)
                        if url_match:
                            issues.append(f"Line {i+1}: Hardcoded URL {url_match.group(1)}")
                            self.stats['magic_values'] += 1
                            
        except Exception as e:
            print(f"Error checking magic values in {file_path}: {e}")
            
        return issues
        
    def check_empty_test_stubs(self, file_path: str) -> List[str]:
        """Check for empty test functions."""
        issues = []
        
        if 'test' not in file_path.lower():
            return issues
            
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Find empty test functions
            empty_test_pattern = r'def (test_\w+)\([^)]*\):\s*(?:pass|\.\.\.)\s*(?:\n|$)'
            
            for match in re.finditer(empty_test_pattern, content):
                test_name = match.group(1)
                issues.append(f"Empty test stub: {test_name}")
                self.stats['empty_test_stubs'] += 1
                
        except Exception as e:
            print(f"Error checking test stubs in {file_path}: {e}")
            
        return issues
        
    def validate_file(self, file_path: str) -> Dict[str, List[str]]:
        """Run all validations on a single file."""
        results = {}
        
        if not os.path.exists(file_path):
            return {'error': [f"File not found: {file_path}"]}
            
        results['todo_docstrings'] = self.check_todo_docstrings(file_path)
        results['unused_imports'] = self.check_unused_imports(file_path)
        results['missing_type_hints'] = self.check_missing_type_hints(file_path)
        results['code_duplication'] = self.check_code_duplication(file_path)
        results['magic_values'] = self.check_magic_values(file_path)
        results['empty_test_stubs'] = self.check_empty_test_stubs(file_path)
        
        # Store issues
        for issue_type, issues in results.items():
            if issues:
                self.issues[file_path].extend(issues)
                
        return results
        
    def print_summary(self, after_cleanup: bool = False):
        """Print validation summary."""
        print("\n" + "=" * 60)
        print(f"C-1-T1 Technical Debt Validation Report")
        print(f"Mode: {'AFTER CLEANUP' if after_cleanup else 'BEFORE CLEANUP'}")
        print("=" * 60)
        
        # Overall stats
        total_issues = sum(self.stats.values())
        print(f"\nTotal Issues Found: {total_issues}")
        print("-" * 40)
        
        for issue_type, count in self.stats.items():
            print(f"{issue_type.replace('_', ' ').title()}: {count}")
            
        # Detailed issues by file
        if self.issues:
            print("\n\nDetailed Issues by File:")
            print("-" * 60)
            
            for file_path, file_issues in sorted(self.issues.items()):
                print(f"\n{file_path}:")
                for issue in file_issues:
                    print(f"  - {issue}")
                    
        # Comparison with original report
        if not after_cleanup:
            print("\n\nComparison with Original C-1-T1 Report:")
            print("-" * 60)
            print("Original Report: 69 issues")
            print(f"Current State: {total_issues} issues")
            
            if total_issues < 69:
                print(f"\n✅ Progress: {69 - total_issues} issues already resolved!")
            elif total_issues > 69:
                print(f"\n⚠️  Warning: {total_issues - 69} new issues found!")
        else:
            print("\n\nCleanup Results:")
            print("-" * 60)
            if total_issues == 0:
                print("✅ All issues resolved!")
            else:
                print(f"⚠️  {total_issues} issues remain (may require manual intervention)")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Validate C-1-T1 technical debt state")
    parser.add_argument('--after-cleanup', action='store_true', 
                       help="Run validation after cleanup (compare results)")
    
    args = parser.parse_args()
    
    # Target files from C-1-T1 implementation
    target_files = [
        "/mnt/c/Projects/dexter/backend/app/services/integrations/__init__.py",
        "/mnt/c/Projects/dexter/backend/app/services/integrations/base_connector.py",
        "/mnt/c/Projects/dexter/backend/app/services/integrations/connector_registry.py",
        "/mnt/c/Projects/dexter/backend/app/services/integrations/auth_manager.py",
        "/mnt/c/Projects/dexter/backend/app/services/integration_service.py",
        "/mnt/c/Projects/dexter/backend/app/models/integrations.py",
        "/mnt/c/Projects/dexter/backend/app/routers/integrations.py",
        "/mnt/c/Projects/dexter/backend/tests/services/test_integration_service.py",
        "/mnt/c/Projects/dexter/backend/tests/routers/test_integrations.py",
        "/mnt/c/Projects/dexter/backend/tests/models/test_integrations.py",
        "/mnt/c/Projects/dexter/backend/tests/services/test_connector_registry.py",
        "/mnt/c/Projects/dexter/backend/tests/services/test_base_connector.py",
        "/mnt/c/Projects/dexter/backend/tests/services/test_auth_manager.py",
    ]
    
    # Run validation
    validator = C1T1Validator()
    
    print("Validating C-1-T1 files...")
    for file_path in target_files:
        validator.validate_file(file_path)
        
    # Print summary
    validator.print_summary(after_cleanup=args.after_cleanup)
    
    # Save detailed report
    import json
    report_file = f"scripts/c1t1_validation_{'after' if args.after_cleanup else 'before'}.json"
    
    report_data = {
        'stats': validator.stats,
        'issues': dict(validator.issues),
        'total_issues': sum(validator.stats.values())
    }
    
    with open(report_file, 'w') as f:
        json.dump(report_data, f, indent=2)
        
    print(f"\n\nDetailed report saved to: {report_file}")
    
    return 0 if sum(validator.stats.values()) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())