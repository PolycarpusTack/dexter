#!/usr/bin/env python3
"""
Quick Technical Debt Check Script for B-4 (N+1 Query Analyzer Integration)
Focuses on critical issues in N+1 analyzer files.
"""

import os
import re
import json
import shutil
from pathlib import Path
from typing import List, Dict, Set, Tuple
from collections import defaultdict

class QuickTechDebtChecker:
    def __init__(self, root_path: str = "/mnt/c/Projects/dexter"):
        self.root_path = Path(root_path)
        self.backend_path = self.root_path / "backend"
        self.frontend_path = self.root_path / "frontend"
        self.issues = defaultdict(list)
        
        # Critical patterns to check
        self.todo_pattern = re.compile(r'(TODO|FIXME|HACK|XXX|BUG)[:|\s](.+)', re.IGNORECASE)
        self.console_log_pattern = re.compile(r'console\.(log|debug|info|warn|error)\s*\(')
        self.any_type_pattern = re.compile(r':\s*any\b')
        self.debug_pattern = re.compile(r'(DEBUG|TEST|TEMP)[:|\s]')
        
        # N+1 analyzer specific files
        self.n1_files = [
            self.backend_path / "app/services/n_plus_one_service.py",
            self.backend_path / "app/utils/n_plus_one_parser.py",
            self.backend_path / "app/routers/api/v1/n_plus_one.py",
            self.backend_path / "app/models/analyzers.py",
            self.frontend_path / "src/api/unified/n1QueryApi.ts",
            self.frontend_path / "src/components/N1QueryModal/N1QueryModal.tsx",
            self.frontend_path / "src/components/N1QueryModal/N1QueryDetails.tsx",
            self.frontend_path / "src/components/N1QueryModal/N1QueryRecommendations.tsx",
            self.frontend_path / "src/utils/n1QueryMockData.ts",
            self.frontend_path / "src/api/unified/hooks/useN1Query.ts",
        ]
        
        # Related analyzer files
        self.analyzer_files = [
            self.backend_path / "app/services/analyzer_registry.py",
            self.backend_path / "app/services/analyzer_orchestrator.py",
            self.backend_path / "app/routers/analyzers.py",
            self.frontend_path / "src/api/unified/analyzersApi.ts",
        ]

    def clean_pycache(self):
        """Remove __pycache__ directories in key locations."""
        count = 0
        for base_path in [self.backend_path / "app", self.backend_path / "tests"]:
            if base_path.exists():
                for pycache in base_path.rglob('__pycache__'):
                    if pycache.is_dir():
                        shutil.rmtree(pycache)
                        count += 1
        return count

    def check_file_quick(self, file_path: Path):
        """Quick check focusing on critical issues."""
        if not file_path.exists():
            return
            
        relative_path = file_path.relative_to(self.root_path)
        
        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.splitlines()
            
            # Check for TODOs/FIXMEs
            todos = []
            for i, line in enumerate(lines, 1):
                match = self.todo_pattern.search(line)
                if match:
                    todos.append((i, match.group(1).upper(), match.group(2).strip()[:80]))
            
            if todos:
                self.issues['todos'].append({
                    'file': str(relative_path),
                    'items': todos
                })
            
            # Check for console.log (JS/TS files)
            if file_path.suffix in ['.ts', '.tsx', '.js', '.jsx']:
                console_logs = []
                for i, line in enumerate(lines, 1):
                    if self.console_log_pattern.search(line):
                        console_logs.append((i, line.strip()[:80]))
                
                if console_logs:
                    self.issues['console_logs'].append({
                        'file': str(relative_path),
                        'logs': console_logs
                    })
                
                # Check for 'any' types
                any_types = []
                for i, line in enumerate(lines, 1):
                    if self.any_type_pattern.search(line):
                        any_types.append((i, line.strip()[:80]))
                
                if any_types:
                    self.issues['any_types'].append({
                        'file': str(relative_path),
                        'types': any_types
                    })
            
            # Check for debug/test code
            debug_code = []
            for i, line in enumerate(lines, 1):
                if self.debug_pattern.search(line):
                    debug_code.append((i, line.strip()[:80]))
            
            if debug_code:
                self.issues['debug_code'].append({
                    'file': str(relative_path),
                    'items': debug_code
                })
            
            # Check for empty catch blocks
            for i in range(len(lines) - 2):
                if 'catch' in lines[i] and '{' in lines[i+1] and '}' in lines[i+2]:
                    if lines[i+1].strip() == '{' and lines[i+2].strip() == '}':
                        self.issues['empty_catch'].append({
                            'file': str(relative_path),
                            'line': i + 1
                        })
                        
        except Exception as e:
            print(f"  ⚠️  Error checking {relative_path}: {e}")

    def check_imports_quick(self):
        """Quick check for obvious import issues."""
        # Check if N+1 analyzer is properly registered
        registry_file = self.backend_path / "app/services/analyzer_registry.py"
        if registry_file.exists():
            content = registry_file.read_text(encoding='utf-8')
            if 'N1QueryAnalyzer' not in content:
                self.issues['integration'].append({
                    'file': str(registry_file.relative_to(self.root_path)),
                    'issue': 'N1QueryAnalyzer not registered in analyzer registry'
                })

    def run_quick_check(self):
        """Run quick checks focusing on N+1 analyzer files."""
        print("🚀 Quick Technical Debt Check for B-4 (N+1 Query Analyzer)")
        print("=" * 70)
        
        # Clean pycache
        print("\n🧹 Cleaning __pycache__ directories...")
        count = self.clean_pycache()
        print(f"  ✓ Removed {count} __pycache__ directories")
        
        # Check N+1 specific files
        print("\n🔍 Checking N+1 Query Analyzer files...")
        for file_path in self.n1_files:
            if file_path.exists():
                print(f"  ✓ {file_path.relative_to(self.root_path)}")
                self.check_file_quick(file_path)
            else:
                print(f"  ⚠️  Missing: {file_path.relative_to(self.root_path)}")
                self.issues['missing_files'].append(str(file_path.relative_to(self.root_path)))
        
        # Check related analyzer files
        print("\n🔍 Checking related analyzer files...")
        for file_path in self.analyzer_files:
            if file_path.exists():
                self.check_file_quick(file_path)
        
        # Check imports
        self.check_imports_quick()
        
        # Generate report
        self.generate_report()

    def generate_report(self):
        """Generate a quick report of findings."""
        print("\n" + "=" * 70)
        print("📊 TECHNICAL DEBT REPORT - B4 (N+1 Query Analyzer)")
        print("=" * 70)
        
        total_issues = sum(len(v) for v in self.issues.values())
        
        if total_issues == 0:
            print("\n✅ No critical technical debt issues found!")
            return
        
        print(f"\n⚠️  Total issues found: {total_issues}")
        
        # Missing files
        if self.issues['missing_files']:
            print(f"\n❌ Missing Files ({len(self.issues['missing_files'])}):")
            for file in self.issues['missing_files']:
                print(f"  • {file}")
        
        # TODOs and FIXMEs
        if self.issues['todos']:
            print(f"\n📝 TODOs/FIXMEs ({len(self.issues['todos'])} files):")
            for item in self.issues['todos']:
                print(f"  • {item['file']}:")
                for line, tag, comment in item['items'][:3]:
                    print(f"    Line {line}: {tag}: {comment}")
        
        # Console logs
        if self.issues['console_logs']:
            print(f"\n🖥️  Console Logs ({len(self.issues['console_logs'])} files):")
            for item in self.issues['console_logs']:
                print(f"  • {item['file']}: {len(item['logs'])} occurrences")
                for line, log in item['logs'][:2]:
                    print(f"    Line {line}: {log}")
        
        # TypeScript 'any' types
        if self.issues['any_types']:
            print(f"\n🚫 TypeScript 'any' Types ({len(self.issues['any_types'])} files):")
            for item in self.issues['any_types']:
                print(f"  • {item['file']}: {len(item['types'])} occurrences")
        
        # Debug/test code
        if self.issues['debug_code']:
            print(f"\n🐛 Debug/Test Code ({len(self.issues['debug_code'])} files):")
            for item in self.issues['debug_code']:
                print(f"  • {item['file']}: {len(item['items'])} occurrences")
        
        # Empty catch blocks
        if self.issues['empty_catch']:
            print(f"\n⚠️  Empty Catch Blocks ({len(self.issues['empty_catch'])}):")
            for item in self.issues['empty_catch']:
                print(f"  • {item['file']}: Line {item['line']}")
        
        # Integration issues
        if self.issues['integration']:
            print(f"\n🔌 Integration Issues ({len(self.issues['integration'])}):")
            for item in self.issues['integration']:
                print(f"  • {item['file']}: {item['issue']}")
        
        # Save report
        report_path = self.root_path / "tech_debt_report_b4.json"
        with open(report_path, 'w') as f:
            json.dump(dict(self.issues), f, indent=2)
        print(f"\n💾 Detailed report saved to: {report_path}")
        
        # Summary
        print("\n📋 SUMMARY:")
        print(f"  • Missing files: {len(self.issues['missing_files'])}")
        print(f"  • TODOs/FIXMEs: {sum(len(item['items']) for item in self.issues['todos'])}")
        print(f"  • Console logs: {sum(len(item['logs']) for item in self.issues['console_logs'])}")
        print(f"  • TypeScript 'any': {sum(len(item['types']) for item in self.issues['any_types'])}")
        print(f"  • Empty catches: {len(self.issues['empty_catch'])}")
        
        print("\n🔧 Next Steps:")
        print("1. Create any missing N+1 analyzer files")
        print("2. Remove console.log statements or replace with proper logging")
        print("3. Replace 'any' types with proper TypeScript types")
        print("4. Address TODO/FIXME comments")
        print("5. Fill in empty catch blocks with proper error handling")

if __name__ == "__main__":
    checker = QuickTechDebtChecker()
    checker.run_quick_check()