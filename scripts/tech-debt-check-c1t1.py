#!/usr/bin/env python3
"""
Technical Debt Check Script for C-1-T1 (Integration Framework)
Checks for various code quality issues in integration-related files.
"""

import ast
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Set, Tuple
import json

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

class TechDebtChecker:
    def __init__(self):
        self.issues = {
            "unused_imports": [],
            "todos_fixmes": [],
            "magic_values": [],
            "empty_catch_blocks": [],
            "missing_type_hints": [],
            "missing_docstrings": [],
            "no_tests": [],
            "security_issues": [],
            "code_duplication": [],
            "high_complexity": []
        }
        
        # Files to check
        self.target_files = [
            "backend/app/services/integrations/",  # Directory
            "backend/app/models/integrations.py",
            "backend/app/routers/integrations.py",
            "backend/app/services/integration_service.py",
            "backend/tests/services/test_integration_service.py"
        ]
        
        # Common magic values to check
        self.magic_patterns = [
            (r'\b\d{4,}\b', 'hardcoded number > 1000'),
            (r'["\']https?://[^"\']+["\']', 'hardcoded URL'),
            (r'["\'][0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}["\']', 'hardcoded IP'),
            (r'timeout\s*=\s*\d+', 'hardcoded timeout'),
            (r'max_retries\s*=\s*\d+', 'hardcoded retry count'),
        ]
        
        # Security patterns
        self.security_patterns = [
            (r'password\s*=\s*["\'][^"\']+["\']', 'hardcoded password'),
            (r'api_key\s*=\s*["\'][^"\']+["\']', 'hardcoded API key'),
            (r'secret\s*=\s*["\'][^"\']+["\']', 'hardcoded secret'),
            (r'token\s*=\s*["\'][^"\']+["\']', 'hardcoded token'),
        ]

    def get_files_to_check(self) -> List[Path]:
        """Get all Python files to check."""
        files = []
        for target in self.target_files:
            target_path = PROJECT_ROOT / target
            if target_path.exists():
                if target_path.is_dir():
                    files.extend(target_path.rglob("*.py"))
                else:
                    files.append(target_path)
        return files

    def check_unused_imports(self, file_path: Path, tree: ast.AST):
        """Check for unused imports."""
        imports = set()
        used_names = set()
        
        # Collect imports
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.asname or alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    imports.add(alias.asname or alias.name)
            elif isinstance(node, ast.Name):
                used_names.add(node.id)
            elif isinstance(node, ast.Attribute):
                if isinstance(node.value, ast.Name):
                    used_names.add(node.value.id)
        
        unused = imports - used_names - {'__future__', 'typing', 'TYPE_CHECKING'}
        for imp in unused:
            self.issues["unused_imports"].append({
                "file": str(file_path),
                "import": imp,
                "line": "N/A"
            })

    def check_todos_fixmes(self, file_path: Path, content: str):
        """Check for TODO and FIXME comments."""
        patterns = [r'#\s*(TODO|FIXME|XXX|HACK|BUG):\s*(.+)', r'""".*?(TODO|FIXME).*?"""']
        
        for line_num, line in enumerate(content.splitlines(), 1):
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    self.issues["todos_fixmes"].append({
                        "file": str(file_path),
                        "line": line_num,
                        "type": match.group(1) if match.groups() else "TODO",
                        "message": match.group(2) if len(match.groups()) > 1 else line.strip()
                    })

    def check_magic_values(self, file_path: Path, content: str):
        """Check for magic numbers and strings."""
        for line_num, line in enumerate(content.splitlines(), 1):
            # Skip comments and docstrings
            if line.strip().startswith('#') or line.strip().startswith('"""'):
                continue
                
            for pattern, description in self.magic_patterns:
                if re.search(pattern, line):
                    self.issues["magic_values"].append({
                        "file": str(file_path),
                        "line": line_num,
                        "type": description,
                        "content": line.strip()
                    })

    def check_empty_catch_blocks(self, file_path: Path, tree: ast.AST):
        """Check for empty except blocks."""
        for node in ast.walk(tree):
            if isinstance(node, ast.ExceptHandler):
                if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                    self.issues["empty_catch_blocks"].append({
                        "file": str(file_path),
                        "line": node.lineno,
                        "type": "empty except block"
                    })

    def check_type_hints(self, file_path: Path, tree: ast.AST):
        """Check for missing type hints in functions."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Skip private methods and test methods
                if node.name.startswith('_') or node.name.startswith('test_'):
                    continue
                    
                # Check return type
                if node.returns is None and node.name != '__init__':
                    self.issues["missing_type_hints"].append({
                        "file": str(file_path),
                        "line": node.lineno,
                        "function": node.name,
                        "issue": "missing return type"
                    })
                
                # Check parameter types
                for arg in node.args.args:
                    if arg.annotation is None and arg.arg != 'self':
                        self.issues["missing_type_hints"].append({
                            "file": str(file_path),
                            "line": node.lineno,
                            "function": node.name,
                            "parameter": arg.arg,
                            "issue": "missing parameter type"
                        })

    def check_docstrings(self, file_path: Path, tree: ast.AST):
        """Check for missing docstrings."""
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                # Skip private methods and test methods for docstring requirement
                if hasattr(node, 'name') and (node.name.startswith('_') or node.name.startswith('test_')):
                    continue
                    
                if not ast.get_docstring(node):
                    self.issues["missing_docstrings"].append({
                        "file": str(file_path),
                        "line": node.lineno,
                        "type": "function" if isinstance(node, ast.FunctionDef) else "class",
                        "name": node.name
                    })

    def check_test_coverage(self, file_path: Path):
        """Check if non-test files have corresponding tests."""
        if 'test' not in str(file_path) and not file_path.name.startswith('__'):
            test_file_name = f"test_{file_path.name}"
            test_paths = [
                file_path.parent.parent / "tests" / test_file_name,
                PROJECT_ROOT / "backend" / "tests" / "services" / test_file_name,
                PROJECT_ROOT / "backend" / "tests" / "models" / test_file_name,
                PROJECT_ROOT / "backend" / "tests" / "routers" / test_file_name,
            ]
            
            if not any(tp.exists() for tp in test_paths):
                self.issues["no_tests"].append({
                    "file": str(file_path),
                    "issue": "no corresponding test file found"
                })

    def check_security_issues(self, file_path: Path, content: str):
        """Check for security issues."""
        for line_num, line in enumerate(content.splitlines(), 1):
            for pattern, description in self.security_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    self.issues["security_issues"].append({
                        "file": str(file_path),
                        "line": line_num,
                        "type": description,
                        "content": line.strip()
                    })

    def check_code_duplication(self, files: List[Path]):
        """Check for duplicated code blocks."""
        # Simple check for duplicated function signatures
        function_signatures = {}
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    tree = ast.parse(f.read())
                    
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        sig = f"{node.name}({len(node.args.args)})"
                        if sig in function_signatures:
                            self.issues["code_duplication"].append({
                                "file1": str(function_signatures[sig]),
                                "file2": str(file_path),
                                "function": node.name,
                                "issue": "similar function signature"
                            })
                        else:
                            function_signatures[sig] = file_path
            except:
                pass

    def check_complexity(self, file_path: Path, tree: ast.AST):
        """Check for high cyclomatic complexity."""
        class ComplexityVisitor(ast.NodeVisitor):
            def __init__(self):
                self.complexity = 0
                self.current_function = None
                self.functions = {}
            
            def visit_FunctionDef(self, node):
                old_function = self.current_function
                old_complexity = self.complexity
                
                self.current_function = node.name
                self.complexity = 1
                
                self.generic_visit(node)
                
                self.functions[node.name] = (self.complexity, node.lineno)
                
                self.current_function = old_function
                self.complexity = old_complexity
            
            def visit_If(self, node):
                self.complexity += 1
                self.generic_visit(node)
            
            def visit_While(self, node):
                self.complexity += 1
                self.generic_visit(node)
            
            def visit_For(self, node):
                self.complexity += 1
                self.generic_visit(node)
            
            def visit_ExceptHandler(self, node):
                self.complexity += 1
                self.generic_visit(node)
        
        visitor = ComplexityVisitor()
        visitor.visit(tree)
        
        for func_name, (complexity, line_no) in visitor.functions.items():
            if complexity > 10:  # Threshold for high complexity
                self.issues["high_complexity"].append({
                    "file": str(file_path),
                    "line": line_no,
                    "function": func_name,
                    "complexity": complexity
                })

    def run_checks(self):
        """Run all checks on target files."""
        files = self.get_files_to_check()
        
        if not files:
            print("Warning: No integration files found to check!")
            return
        
        print(f"Checking {len(files)} files...")
        
        for file_path in files:
            print(f"  Checking {file_path}...")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Parse AST
                try:
                    tree = ast.parse(content)
                    
                    # AST-based checks
                    self.check_unused_imports(file_path, tree)
                    self.check_empty_catch_blocks(file_path, tree)
                    self.check_type_hints(file_path, tree)
                    self.check_docstrings(file_path, tree)
                    self.check_complexity(file_path, tree)
                except SyntaxError as e:
                    print(f"    Syntax error in {file_path}: {e}")
                
                # Text-based checks
                self.check_todos_fixmes(file_path, content)
                self.check_magic_values(file_path, content)
                self.check_security_issues(file_path, content)
                
                # File-level checks
                self.check_test_coverage(file_path)
                
            except Exception as e:
                print(f"    Error checking {file_path}: {e}")
        
        # Multi-file checks
        self.check_code_duplication(files)

    def generate_report(self) -> str:
        """Generate a report of all issues found."""
        report = ["# Technical Debt Report for C-1-T1 (Integration Framework)\n"]
        
        total_issues = sum(len(issues) for issues in self.issues.values())
        report.append(f"Total issues found: {total_issues}\n")
        
        for issue_type, issues in self.issues.items():
            if issues:
                report.append(f"\n## {issue_type.replace('_', ' ').title()} ({len(issues)} issues)\n")
                
                for issue in issues[:10]:  # Show first 10
                    if issue_type == "unused_imports":
                        report.append(f"- {issue['file']}: Unused import '{issue['import']}'")
                    elif issue_type == "todos_fixmes":
                        report.append(f"- {issue['file']}:{issue['line']} - {issue['type']}: {issue['message']}")
                    elif issue_type == "magic_values":
                        report.append(f"- {issue['file']}:{issue['line']} - {issue['type']}: {issue['content'][:80]}...")
                    elif issue_type == "empty_catch_blocks":
                        report.append(f"- {issue['file']}:{issue['line']} - {issue['type']}")
                    elif issue_type == "missing_type_hints":
                        report.append(f"- {issue['file']}:{issue['line']} - Function '{issue['function']}': {issue['issue']}")
                    elif issue_type == "missing_docstrings":
                        report.append(f"- {issue['file']}:{issue['line']} - Missing docstring for {issue['type']} '{issue['name']}'")
                    elif issue_type == "no_tests":
                        report.append(f"- {issue['file']}: {issue['issue']}")
                    elif issue_type == "security_issues":
                        report.append(f"- {issue['file']}:{issue['line']} - {issue['type']}")
                    elif issue_type == "code_duplication":
                        report.append(f"- Duplicate function '{issue['function']}' in {issue['file1']} and {issue['file2']}")
                    elif issue_type == "high_complexity":
                        report.append(f"- {issue['file']}:{issue['line']} - Function '{issue['function']}' has complexity {issue['complexity']}")
                
                if len(issues) > 10:
                    report.append(f"  ... and {len(issues) - 10} more")
        
        return "\n".join(report)

    def save_issues_json(self):
        """Save issues to JSON for auto-fix script."""
        output_path = PROJECT_ROOT / "scripts" / "c1t1_issues.json"
        with open(output_path, 'w') as f:
            json.dump(self.issues, f, indent=2)
        print(f"\nIssues saved to: {output_path}")

def main():
    checker = TechDebtChecker()
    checker.run_checks()
    
    report = checker.generate_report()
    print("\n" + report)
    
    # Save report
    report_path = PROJECT_ROOT / "scripts" / "c1t1_tech_debt_report.md"
    with open(report_path, 'w') as f:
        f.write(report)
    print(f"\nFull report saved to: {report_path}")
    
    # Save issues for auto-fix
    checker.save_issues_json()
    
    # Return exit code based on issues found
    total_issues = sum(len(issues) for issues in checker.issues.values())
    return 1 if total_issues > 0 else 0

if __name__ == "__main__":
    sys.exit(main())