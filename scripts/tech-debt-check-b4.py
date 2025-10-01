#!/usr/bin/env python3
"""
Technical Debt Check Script for B-4 (N+1 Query Analyzer Integration)
Identifies and fixes common issues in the codebase after feature completion.
"""

import os
import re
import json
import shutil
from pathlib import Path
from typing import List, Dict, Set, Tuple
from collections import defaultdict

class TechnicalDebtChecker:
    def __init__(self, root_path: str = "/mnt/c/Projects/dexter"):
        self.root_path = Path(root_path)
        self.backend_path = self.root_path / "backend"
        self.frontend_path = self.root_path / "frontend"
        self.issues = defaultdict(list)
        self.fixed_count = 0
        
        # Patterns to check
        self.todo_pattern = re.compile(r'(TODO|FIXME|HACK|XXX|BUG|DEPRECATED)[:|\s](.+)', re.IGNORECASE)
        self.console_log_pattern = re.compile(r'console\.(log|debug|info|warn|error)\s*\(')
        self.magic_number_pattern = re.compile(r'\b(?<!\.)\d{2,}(?![\.\d])\b')
        self.any_type_pattern = re.compile(r':\s*any\b')
        self.unused_import_py = re.compile(r'^(?:from\s+[\w\.]+\s+)?import\s+(.+)$', re.MULTILINE)
        self.unused_import_ts = re.compile(r'^import\s+(?:{([^}]+)}|(\w+))\s+from\s+[\'"]([^\'"]+)[\'"];?$', re.MULTILINE)
        
        # Common magic strings that should be constants
        self.magic_strings = {
            'http://localhost': 'API_BASE_URL',
            'Bearer ': 'AUTH_PREFIX',
            'application/json': 'CONTENT_TYPE_JSON',
            '200': 'HTTP_OK',
            '404': 'HTTP_NOT_FOUND',
            '500': 'HTTP_SERVER_ERROR',
            'n_plus_one': 'ANALYZER_TYPE_N_PLUS_ONE',
            'deadlock': 'ANALYZER_TYPE_DEADLOCK',
            'memory_leak': 'ANALYZER_TYPE_MEMORY_LEAK'
        }

    def check_unused_imports_python(self, file_path: Path) -> List[str]:
        """Check for unused imports in Python files."""
        try:
            content = file_path.read_text(encoding='utf-8')
            imports = []
            
            # Extract all imports
            for match in self.unused_import_py.finditer(content):
                import_stmt = match.group(1)
                if ' as ' in import_stmt:
                    imports.extend([imp.split(' as ')[1].strip() for imp in import_stmt.split(',')])
                else:
                    imports.extend([imp.strip() for imp in import_stmt.split(',')])
            
            # Check which imports are used
            unused = []
            for imp in imports:
                if imp.startswith('_'):  # Skip private imports
                    continue
                # Simple check - look for usage in the file
                imp_pattern = re.compile(r'\b' + re.escape(imp) + r'\b')
                # Count occurrences (should be at least 2 - one for import, one for usage)
                if len(imp_pattern.findall(content)) < 2:
                    unused.append(imp)
            
            return unused
        except Exception as e:
            return []

    def check_unused_imports_typescript(self, file_path: Path) -> List[str]:
        """Check for unused imports in TypeScript/JavaScript files."""
        try:
            content = file_path.read_text(encoding='utf-8')
            imports = []
            
            # Extract all imports
            for match in self.unused_import_ts.finditer(content):
                if match.group(1):  # Named imports
                    imports.extend([imp.strip() for imp in match.group(1).split(',')])
                elif match.group(2):  # Default import
                    imports.append(match.group(2))
            
            # Check which imports are used
            unused = []
            for imp in imports:
                # Simple check - look for usage in the file
                imp_pattern = re.compile(r'\b' + re.escape(imp) + r'\b')
                # Count occurrences (should be at least 2 - one for import, one for usage)
                if len(imp_pattern.findall(content)) < 2:
                    unused.append(imp)
            
            return unused
        except Exception as e:
            return []

    def check_todos_and_fixmes(self, file_path: Path) -> List[Tuple[int, str, str]]:
        """Find TODO, FIXME, and similar comments."""
        todos = []
        try:
            content = file_path.read_text(encoding='utf-8')
            for i, line in enumerate(content.splitlines(), 1):
                match = self.todo_pattern.search(line)
                if match:
                    todos.append((i, match.group(1).upper(), match.group(2).strip()))
        except Exception as e:
            pass
        return todos

    def check_magic_numbers(self, file_path: Path) -> List[Tuple[int, str]]:
        """Find magic numbers that should be constants."""
        magic_numbers = []
        try:
            content = file_path.read_text(encoding='utf-8')
            for i, line in enumerate(content.splitlines(), 1):
                # Skip comments and strings
                if '//' in line or '#' in line or '"' in line or "'" in line:
                    continue
                matches = self.magic_number_pattern.findall(line)
                for match in matches:
                    # Filter out common acceptable numbers
                    if int(match) not in [10, 20, 30, 40, 50, 60, 80, 90, 100, 1000]:
                        magic_numbers.append((i, match))
        except Exception as e:
            pass
        return magic_numbers

    def check_console_logs(self, file_path: Path) -> List[Tuple[int, str]]:
        """Find console.log statements in TypeScript/JavaScript files."""
        console_logs = []
        try:
            content = file_path.read_text(encoding='utf-8')
            for i, line in enumerate(content.splitlines(), 1):
                if self.console_log_pattern.search(line):
                    console_logs.append((i, line.strip()))
        except Exception as e:
            pass
        return console_logs

    def check_any_types(self, file_path: Path) -> List[Tuple[int, str]]:
        """Find TypeScript 'any' types."""
        any_types = []
        try:
            content = file_path.read_text(encoding='utf-8')
            for i, line in enumerate(content.splitlines(), 1):
                if self.any_type_pattern.search(line):
                    any_types.append((i, line.strip()))
        except Exception as e:
            pass
        return any_types

    def check_error_handling(self, file_path: Path) -> List[Tuple[int, str]]:
        """Check for proper error handling patterns."""
        issues = []
        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.splitlines()
            
            for i, line in enumerate(lines):
                # Check for empty catch blocks
                if 'catch' in line and i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line == '{' and i + 2 < len(lines):
                        if lines[i + 2].strip() == '}':
                            issues.append((i + 1, "Empty catch block"))
                
                # Check for generic Exception in Python
                if file_path.suffix == '.py' and 'except Exception:' in line:
                    issues.append((i + 1, "Generic Exception catch - be more specific"))
                
                # Check for throw without proper error
                if 'throw new Error()' in line or 'raise Exception()' in line:
                    issues.append((i + 1, "Error thrown without message"))
                    
        except Exception as e:
            pass
        return issues

    def clean_pycache(self):
        """Remove all __pycache__ directories."""
        pycache_dirs = []
        for pycache in self.root_path.rglob('__pycache__'):
            if pycache.is_dir():
                pycache_dirs.append(pycache)
                shutil.rmtree(pycache)
        return pycache_dirs

    def check_magic_strings(self, file_path: Path) -> List[Tuple[int, str, str]]:
        """Find magic strings that should be constants."""
        magic_string_issues = []
        try:
            content = file_path.read_text(encoding='utf-8')
            for i, line in enumerate(content.splitlines(), 1):
                for magic_str, const_name in self.magic_strings.items():
                    if magic_str in line and const_name not in line:
                        magic_string_issues.append((i, magic_str, const_name))
        except Exception as e:
            pass
        return magic_string_issues

    def check_file(self, file_path: Path):
        """Run all checks on a single file."""
        relative_path = file_path.relative_to(self.root_path)
        
        # Check unused imports
        if file_path.suffix == '.py':
            unused = self.check_unused_imports_python(file_path)
            if unused:
                self.issues['unused_imports'].append({
                    'file': str(relative_path),
                    'imports': unused
                })
        elif file_path.suffix in ['.ts', '.tsx', '.js', '.jsx']:
            unused = self.check_unused_imports_typescript(file_path)
            if unused:
                self.issues['unused_imports'].append({
                    'file': str(relative_path),
                    'imports': unused
                })
        
        # Check TODOs and FIXMEs
        todos = self.check_todos_and_fixmes(file_path)
        if todos:
            self.issues['todos'].append({
                'file': str(relative_path),
                'items': todos
            })
        
        # Check magic numbers
        magic_numbers = self.check_magic_numbers(file_path)
        if magic_numbers:
            self.issues['magic_numbers'].append({
                'file': str(relative_path),
                'numbers': magic_numbers
            })
        
        # Check magic strings
        magic_strings = self.check_magic_strings(file_path)
        if magic_strings:
            self.issues['magic_strings'].append({
                'file': str(relative_path),
                'strings': magic_strings
            })
        
        # Check console.log statements (TS/JS only)
        if file_path.suffix in ['.ts', '.tsx', '.js', '.jsx']:
            console_logs = self.check_console_logs(file_path)
            if console_logs:
                self.issues['console_logs'].append({
                    'file': str(relative_path),
                    'logs': console_logs
                })
            
            # Check for 'any' types in TypeScript
            if file_path.suffix in ['.ts', '.tsx']:
                any_types = self.check_any_types(file_path)
                if any_types:
                    self.issues['any_types'].append({
                        'file': str(relative_path),
                        'types': any_types
                    })
        
        # Check error handling
        error_issues = self.check_error_handling(file_path)
        if error_issues:
            self.issues['error_handling'].append({
                'file': str(relative_path),
                'issues': error_issues
            })

    def check_n1_analyzer_files(self):
        """Specifically check N+1 Query Analyzer related files."""
        n1_files = [
            self.backend_path / "app/services/n_plus_one_service.py",
            self.backend_path / "app/utils/n_plus_one_parser.py",
            self.backend_path / "app/routers/api/v1/n_plus_one.py",
            self.frontend_path / "src/api/unified/n1QueryApi.ts",
            self.frontend_path / "src/components/N1QueryModal/N1QueryModal.tsx",
            self.frontend_path / "src/utils/n1QueryMockData.ts",
        ]
        
        print("\n🔍 Checking N+1 Query Analyzer specific files...")
        for file_path in n1_files:
            if file_path.exists():
                print(f"  ✓ Checking {file_path.relative_to(self.root_path)}")
                self.check_file(file_path)
            else:
                print(f"  ⚠️  File not found: {file_path.relative_to(self.root_path)}")

    def run_checks(self):
        """Run all checks across the codebase."""
        print("🔍 Technical Debt Check for B-4 (N+1 Query Analyzer Integration)")
        print("=" * 70)
        
        # Clean __pycache__ directories
        print("\n🧹 Cleaning __pycache__ directories...")
        pycache_dirs = self.clean_pycache()
        if pycache_dirs:
            print(f"  ✓ Removed {len(pycache_dirs)} __pycache__ directories")
        
        # Check N+1 specific files first
        self.check_n1_analyzer_files()
        
        # Check all Python files in backend
        print("\n🐍 Checking Python files...")
        for py_file in self.backend_path.rglob('*.py'):
            if 'node_modules' not in str(py_file) and '__pycache__' not in str(py_file):
                self.check_file(py_file)
        
        # Check all TypeScript/JavaScript files in frontend
        print("\n📘 Checking TypeScript/JavaScript files...")
        for ext in ['*.ts', '*.tsx', '*.js', '*.jsx']:
            for ts_file in self.frontend_path.rglob(ext):
                if 'node_modules' not in str(ts_file) and 'dist' not in str(ts_file):
                    self.check_file(ts_file)
        
        # Generate report
        self.generate_report()

    def generate_report(self):
        """Generate a comprehensive report of findings."""
        print("\n" + "=" * 70)
        print("📊 TECHNICAL DEBT REPORT")
        print("=" * 70)
        
        total_issues = sum(len(v) for v in self.issues.values())
        
        if total_issues == 0:
            print("\n✅ No technical debt issues found! Great job!")
            return
        
        print(f"\n⚠️  Total issues found: {total_issues}")
        
        # Unused imports
        if self.issues['unused_imports']:
            print(f"\n📦 Unused Imports ({len(self.issues['unused_imports'])} files):")
            for item in self.issues['unused_imports'][:5]:  # Show first 5
                print(f"  • {item['file']}: {', '.join(item['imports'])}")
            if len(self.issues['unused_imports']) > 5:
                print(f"  ... and {len(self.issues['unused_imports']) - 5} more files")
        
        # TODOs and FIXMEs
        if self.issues['todos']:
            print(f"\n📝 TODOs/FIXMEs ({len(self.issues['todos'])} files):")
            for item in self.issues['todos'][:5]:
                print(f"  • {item['file']}:")
                for line, tag, comment in item['items'][:2]:
                    print(f"    Line {line}: {tag}: {comment[:50]}...")
        
        # Magic numbers
        if self.issues['magic_numbers']:
            print(f"\n🔢 Magic Numbers ({len(self.issues['magic_numbers'])} files):")
            for item in self.issues['magic_numbers'][:5]:
                print(f"  • {item['file']}: {len(item['numbers'])} occurrences")
        
        # Magic strings
        if self.issues['magic_strings']:
            print(f"\n📝 Magic Strings ({len(self.issues['magic_strings'])} files):")
            for item in self.issues['magic_strings'][:5]:
                print(f"  • {item['file']}:")
                for line, magic_str, const_name in item['strings'][:2]:
                    print(f"    Line {line}: '{magic_str}' → {const_name}")
        
        # Console logs
        if self.issues['console_logs']:
            print(f"\n🖥️  Console Logs ({len(self.issues['console_logs'])} files):")
            for item in self.issues['console_logs'][:5]:
                print(f"  • {item['file']}: {len(item['logs'])} occurrences")
        
        # TypeScript 'any' types
        if self.issues['any_types']:
            print(f"\n🚫 TypeScript 'any' Types ({len(self.issues['any_types'])} files):")
            for item in self.issues['any_types'][:5]:
                print(f"  • {item['file']}: {len(item['types'])} occurrences")
        
        # Error handling issues
        if self.issues['error_handling']:
            print(f"\n⚠️  Error Handling Issues ({len(self.issues['error_handling'])} files):")
            for item in self.issues['error_handling'][:5]:
                print(f"  • {item['file']}:")
                for line, issue in item['issues'][:2]:
                    print(f"    Line {line}: {issue}")
        
        # Save detailed report
        report_path = self.root_path / "tech_debt_report_b4.json"
        with open(report_path, 'w') as f:
            json.dump(dict(self.issues), f, indent=2)
        print(f"\n💾 Detailed report saved to: {report_path}")
        
        # Recommendations
        print("\n📋 RECOMMENDATIONS:")
        print("1. Address TODO/FIXME comments, especially those related to N+1 analyzer")
        print("2. Replace magic numbers and strings with named constants")
        print("3. Remove or replace console.log statements with proper logging")
        print("4. Replace 'any' types with proper TypeScript types")
        print("5. Fix empty catch blocks and improve error handling")
        print("6. Remove unused imports to keep code clean")
        
        print("\n✨ Run 'python scripts/fix_tech_debt_b4.py' to automatically fix some issues")

if __name__ == "__main__":
    checker = TechnicalDebtChecker()
    checker.run_checks()