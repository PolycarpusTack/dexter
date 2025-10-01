#!/usr/bin/env python3
"""
Find and report unused imports in Python files.
"""

import ast
import os
from pathlib import Path
from typing import Set, List, Tuple


class ImportVisitor(ast.NodeVisitor):
    """Visitor to collect imports and their usage."""
    
    def __init__(self):
        self.imports = {}  # name -> (module, line_number)
        self.used_names = set()
        self.in_import = False
    
    def visit_Import(self, node):
        self.in_import = True
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imports[name] = (alias.name, node.lineno)
        self.in_import = False
    
    def visit_ImportFrom(self, node):
        self.in_import = True
        module = node.module or ''
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            if name != '*':  # Skip star imports
                self.imports[name] = (f"{module}.{alias.name}", node.lineno)
        self.in_import = False
    
    def visit_Name(self, node):
        if not self.in_import:
            self.used_names.add(node.id)
    
    def visit_Attribute(self, node):
        if isinstance(node.value, ast.Name) and not self.in_import:
            self.used_names.add(node.value.id)
        self.generic_visit(node)


def find_unused_imports(file_path: Path) -> List[Tuple[str, int, str]]:
    """Find unused imports in a Python file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content)
        visitor = ImportVisitor()
        visitor.visit(tree)
        
        unused = []
        for name, (module, line) in visitor.imports.items():
            if name not in visitor.used_names:
                # Special cases
                if name == '__all__':  # __all__ is often used in __init__.py
                    continue
                if module.startswith('__future__'):  # Always keep __future__ imports
                    continue
                if name in content:  # Sometimes used in strings or comments
                    continue
                
                unused.append((name, line, module))
        
        return unused
    
    except Exception as e:
        return []


def main():
    """Main entry point."""
    app_dir = Path('app')
    
    if not app_dir.exists():
        print("Error: 'app' directory not found!")
        return
    
    python_files = list(app_dir.rglob('*.py'))
    total_unused = 0
    
    for file_path in sorted(python_files):
        unused = find_unused_imports(file_path)
        
        if unused:
            print(f"\n{file_path}:")
            for name, line, module in unused:
                print(f"  Line {line}: '{name}' from {module}")
                total_unused += 1
    
    print(f"\nTotal unused imports: {total_unused}")


if __name__ == '__main__':
    main()