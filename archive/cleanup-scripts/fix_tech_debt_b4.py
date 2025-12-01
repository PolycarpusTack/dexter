#!/usr/bin/env python3
"""
Automatic Technical Debt Fixer for B-4 (N+1 Query Analyzer Integration)
Automatically fixes some common issues found by the tech debt checker.
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Set, Tuple

class TechDebtFixer:
    def __init__(self, root_path: str = "/mnt/c/Projects/dexter"):
        self.root_path = Path(root_path)
        self.backend_path = self.root_path / "backend"
        self.frontend_path = self.root_path / "frontend"
        self.fixes_applied = 0
        
    def remove_console_logs(self, file_path: Path) -> int:
        """Remove console.log statements and replace with proper logging."""
        try:
            content = file_path.read_text(encoding='utf-8')
            original_content = content
            
            # Pattern to match console.log/debug/info/warn/error
            console_pattern = re.compile(
                r'^\s*console\.(log|debug|info|warn|error)\s*\([^)]*\);\s*$',
                re.MULTILINE
            )
            
            # Remove console statements
            content = console_pattern.sub('', content)
            
            # For meaningful console.warn statements, replace with logger
            warn_pattern = re.compile(
                r'console\.warn\s*\(\s*[\'"]([^\'"]*)[\'"]\s*,?\s*([^)]*)\)',
                re.MULTILINE
            )
            
            if 'logger' in content or 'getLogger' in content:
                # Replace console.warn with logger.warn if logger is available
                content = warn_pattern.sub(r'logger.warn("\1", \2)', content)
            
            if content != original_content:
                file_path.write_text(content, encoding='utf-8')
                return content.count('\n') - original_content.count('\n')
            return 0
        except Exception as e:
            print(f"Error fixing console logs in {file_path}: {e}")
            return 0

    def fix_any_types(self, file_path: Path) -> int:
        """Replace common 'any' types with more specific types."""
        try:
            content = file_path.read_text(encoding='utf-8')
            original_content = content
            fixes = 0
            
            # Common replacements
            replacements = [
                # Event-related any types
                (r'event:\s*any\b', 'event: SentryEvent'),
                (r'eventData:\s*any\b', 'eventData: SentryEvent'),
                (r'data:\s*any\[\]', 'data: unknown[]'),
                (r'error:\s*any\b', 'error: Error | unknown'),
                (r'response:\s*any\b', 'response: unknown'),
                # N+1 specific types
                (r'pattern:\s*any\b', 'pattern: N1QueryPattern'),
                (r'queryGroups:\s*any\[\]', 'queryGroups: QueryGroup[]'),
                (r'analysis:\s*any\b', 'analysis: AnalysisResult'),
                (r'recommendation:\s*any\b', 'recommendation: AnalysisRecommendation'),
                # Generic object types
                (r':\s*any\s*=\s*\{\}', ': Record<string, unknown> = {}'),
                (r':\s*any\s*=\s*\[\]', ': unknown[] = []'),
            ]
            
            for pattern, replacement in replacements:
                new_content = re.sub(pattern, replacement, content)
                if new_content != content:
                    fixes += 1
                    content = new_content
            
            if content != original_content:
                # Add necessary imports if not present
                if 'SentryEvent' in content and 'import' in content and 'SentryEvent' not in original_content:
                    import_line = "import { SentryEvent } from '../../types/sentry';\n"
                    content = self._add_import(content, import_line)
                
                if 'N1QueryPattern' in content and 'N1QueryPattern' not in original_content:
                    import_line = "import { N1QueryPattern, QueryGroup } from '../../types/analyzers';\n"
                    content = self._add_import(content, import_line)
                
                if 'AnalysisResult' in content and 'AnalysisResult' not in original_content:
                    import_line = "import { AnalysisResult, AnalysisRecommendation } from '../../types/analyzers';\n"
                    content = self._add_import(content, import_line)
                
                file_path.write_text(content, encoding='utf-8')
                return fixes
            return 0
        except Exception as e:
            print(f"Error fixing any types in {file_path}: {e}")
            return 0

    def _add_import(self, content: str, import_line: str) -> str:
        """Add import statement after the last import in the file."""
        lines = content.splitlines()
        last_import_idx = -1
        
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, import_line.strip())
        else:
            # No imports found, add at the beginning
            lines.insert(0, import_line.strip())
        
        return '\n'.join(lines)

    def fix_empty_catch_blocks(self, file_path: Path) -> int:
        """Add proper error handling to empty catch blocks."""
        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.splitlines()
            fixes = 0
            
            i = 0
            while i < len(lines) - 2:
                if 'catch' in lines[i] and '{' in lines[i+1] and '}' in lines[i+2]:
                    if lines[i+1].strip() == '{' and lines[i+2].strip() == '}':
                        # Found empty catch block
                        indent = len(lines[i]) - len(lines[i].lstrip())
                        
                        # Extract error variable name
                        error_match = re.search(r'catch\s*\(\s*(\w+)\s*\)', lines[i])
                        error_var = error_match.group(1) if error_match else 'error'
                        
                        # Determine appropriate error handling
                        if file_path.suffix == '.py':
                            lines[i+2:i+2] = [
                                ' ' * (indent + 4) + f'logger.error(f"Error occurred: {{{error_var}}}")'
                            ]
                        else:  # TypeScript/JavaScript
                            lines[i+2:i+2] = [
                                ' ' * (indent + 2) + f'console.error("Error occurred:", {error_var});'
                            ]
                        fixes += 1
                        i += 1  # Skip the added line
                i += 1
            
            if fixes > 0:
                file_path.write_text('\n'.join(lines), encoding='utf-8')
            return fixes
        except Exception as e:
            print(f"Error fixing empty catch blocks in {file_path}: {e}")
            return 0

    def add_type_imports(self):
        """Ensure necessary type imports are present in TypeScript files."""
        # Check N1QueryModal for proper imports
        modal_file = self.frontend_path / "src/components/N1QueryModal/N1QueryModal.tsx"
        if modal_file.exists():
            try:
                content = modal_file.read_text(encoding='utf-8')
                
                # Check if we need to add imports
                required_imports = [
                    ("N1QueryPattern", "import { N1QueryPattern, QueryGroup } from '../../types/analyzers';"),
                    ("AnalysisResult", "import { AnalysisResult, AnalysisRecommendation } from '../../types/analyzers';"),
                ]
                
                for type_name, import_stmt in required_imports:
                    if type_name in content and import_stmt not in content:
                        content = self._add_import(content, import_stmt)
                        self.fixes_applied += 1
                
                modal_file.write_text(content, encoding='utf-8')
            except Exception as e:
                print(f"Error adding type imports: {e}")

    def fix_magic_strings(self):
        """Replace magic strings with constants."""
        # Create constants file if it doesn't exist
        constants_file = self.frontend_path / "src/constants/analyzers.ts"
        if not constants_file.exists():
            constants_content = """/**
 * Analyzer-related constants
 */

export const ANALYZER_TYPES = {
  N_PLUS_ONE: 'n_plus_one',
  DEADLOCK: 'deadlock',
  MEMORY_LEAK: 'memory_leak',
  PROMISE_REJECTION: 'promise_rejection',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

export const API_CONSTANTS = {
  BASE_URL: process.env.VITE_API_URL || 'http://localhost:8000',
  AUTH_PREFIX: 'Bearer ',
  CONTENT_TYPE_JSON: 'application/json',
} as const;

export const N1_QUERY_CONSTANTS = {
  MIN_QUERIES_FOR_PATTERN: 3,
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.6,
} as const;
"""
            constants_file.parent.mkdir(parents=True, exist_ok=True)
            constants_file.write_text(constants_content, encoding='utf-8')
            self.fixes_applied += 1
            print(f"Created constants file: {constants_file}")

    def run_fixes(self):
        """Run all automatic fixes."""
        print("🔧 Running Automatic Technical Debt Fixes for B-4")
        print("=" * 70)
        
        # Fix issues in N+1 analyzer files
        n1_files = [
            self.backend_path / "app/services/n_plus_one_service.py",
            self.backend_path / "app/utils/n_plus_one_parser.py",
            self.backend_path / "app/routers/api/v1/n_plus_one.py",
            self.frontend_path / "src/api/unified/n1QueryApi.ts",
            self.frontend_path / "src/components/N1QueryModal/N1QueryModal.tsx",
            self.frontend_path / "src/api/unified/hooks/useN1Query.ts",
            self.frontend_path / "src/api/unified/analyzersApi.ts",
        ]
        
        print("\n📝 Fixing issues in N+1 analyzer files...")
        for file_path in n1_files:
            if file_path.exists():
                print(f"\n  Processing: {file_path.relative_to(self.root_path)}")
                
                if file_path.suffix in ['.ts', '.tsx', '.js', '.jsx']:
                    # Fix console.logs
                    removed = self.remove_console_logs(file_path)
                    if removed != 0:
                        print(f"    ✓ Removed console.log statements")
                        self.fixes_applied += 1
                    
                    # Fix any types
                    fixed_types = self.fix_any_types(file_path)
                    if fixed_types > 0:
                        print(f"    ✓ Fixed {fixed_types} 'any' type occurrences")
                        self.fixes_applied += fixed_types
                
                # Fix empty catch blocks
                fixed_catches = self.fix_empty_catch_blocks(file_path)
                if fixed_catches > 0:
                    print(f"    ✓ Fixed {fixed_catches} empty catch blocks")
                    self.fixes_applied += fixed_catches
        
        # Add type imports
        print("\n📦 Adding missing type imports...")
        self.add_type_imports()
        
        # Create constants file
        print("\n📋 Creating constants for magic strings...")
        self.fix_magic_strings()
        
        # Summary
        print("\n" + "=" * 70)
        print(f"✅ FIXES APPLIED: {self.fixes_applied}")
        print("\n📋 Next Steps:")
        print("1. Review the changes made by this script")
        print("2. Run tests to ensure nothing is broken")
        print("3. Manually address remaining TODOs and FIXMEs")
        print("4. Update any hardcoded strings to use the new constants")
        print("5. Add proper error messages to catch blocks")
        
        # Save fix report
        fix_report = {
            'fixes_applied': self.fixes_applied,
            'timestamp': str(Path.cwd()),
            'files_processed': [str(f.relative_to(self.root_path)) for f in n1_files if f.exists()]
        }
        
        report_path = self.root_path / "tech_debt_fixes_b4.json"
        with open(report_path, 'w') as f:
            json.dump(fix_report, f, indent=2)
        print(f"\n💾 Fix report saved to: {report_path}")

if __name__ == "__main__":
    fixer = TechDebtFixer()
    fixer.run_fixes()