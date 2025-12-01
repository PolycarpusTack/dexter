#!/usr/bin/env python3
"""
Fix critical issues in Python files.
"""

import re
from pathlib import Path
from typing import List, Tuple


def fix_missing_imports(file_path: Path) -> bool:
    """Fix missing import statements based on undefined names."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        lines = content.split('\n')
        
        # Common missing imports based on undefined names
        missing_imports = {
            'BaseModel': 'from pydantic import BaseModel',
            'Field': 'from pydantic import Field',
            'Optional': 'from typing import Optional',
            'List': 'from typing import List',
            'Dict': 'from typing import Dict',
            'Any': 'from typing import Any',
            'Tuple': 'from typing import Tuple',
            'Callable': 'from typing import Callable',
            'Union': 'from typing import Union',
            'log_error_with_context': 'from app.utils.logging_config import log_error_with_context',
        }
        
        # Find undefined names in the file
        undefined_pattern = r'\b(' + '|'.join(missing_imports.keys()) + r')\b'
        
        # Check if we need to add imports
        needed_imports = set()
        for match in re.finditer(undefined_pattern, content):
            name = match.group(1)
            # Check if it's already imported
            if not re.search(f'import.*{name}|from.*import.*{name}', content):
                needed_imports.add(name)
        
        if not needed_imports:
            return False
        
        # Find where to insert imports (after existing imports)
        import_end = 0
        for i, line in enumerate(lines):
            if line.strip() and not line.startswith(('import ', 'from ', '#')):
                if i > 0 and any(lines[j].startswith(('import ', 'from ')) for j in range(i)):
                    import_end = i
                    break
        
        # Group typing imports
        typing_imports = []
        other_imports = []
        
        for name in needed_imports:
            import_stmt = missing_imports.get(name)
            if import_stmt:
                if 'from typing import' in import_stmt:
                    typing_imports.append(name)
                else:
                    other_imports.append(import_stmt)
        
        # Combine typing imports
        imports_to_add = []
        if typing_imports:
            imports_to_add.append(f"from typing import {', '.join(sorted(typing_imports))}")
        imports_to_add.extend(sorted(other_imports))
        
        # Insert the imports
        for imp in reversed(imports_to_add):
            lines.insert(import_end, imp)
        
        content = '\n'.join(lines)
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    
    except Exception as e:
        print(f"Error fixing imports in {file_path}: {e}")
        return False


def fix_indentation_errors(file_path: Path) -> bool:
    """Fix indentation errors in Python files."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Fix common indentation patterns
        # Fix single line imports that have leading space
        content = re.sub(r'^(\s)+(import|from)\s', r'\2 ', content, flags=re.MULTILINE)
        
        # Fix class body indentation
        lines = content.split('\n')
        fixed_lines = []
        
        for i, line in enumerate(lines):
            # Check for common indentation issues
            if line.strip() and not line[0].isspace():
                # This is a top-level line
                fixed_lines.append(line)
            else:
                # Check if the line has incorrect indentation
                stripped = line.lstrip()
                if stripped:
                    # Count the indentation level
                    spaces = len(line) - len(stripped)
                    # Ensure it's a multiple of 4
                    if spaces % 4 != 0:
                        correct_spaces = (spaces // 4) * 4
                        fixed_lines.append(' ' * correct_spaces + stripped)
                    else:
                        fixed_lines.append(line)
                else:
                    fixed_lines.append(line)
        
        content = '\n'.join(fixed_lines)
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    
    except Exception as e:
        print(f"Error fixing indentation in {file_path}: {e}")
        return False


def main():
    """Main entry point."""
    app_dir = Path('app')
    
    if not app_dir.exists():
        print("Error: 'app' directory not found!")
        return
    
    # Focus on files with critical errors
    critical_files = [
        'core/config.py',
        'core/factory.py',
        'core/logging.py',
        'core/middleware.py',
        'middleware/error_handler.py',
        'models/ai.py',
        'models/ai_models.py',
        'minimal.py',
        'utils/pydantic_compat.py',
    ]
    
    for rel_path in critical_files:
        file_path = app_dir / rel_path
        if file_path.exists():
            fixed_imports = fix_missing_imports(file_path)
            fixed_indent = fix_indentation_errors(file_path)
            
            if fixed_imports or fixed_indent:
                print(f"✓ Fixed: {file_path}")
            else:
                print(f"  No critical issues: {file_path}")


if __name__ == '__main__':
    main()