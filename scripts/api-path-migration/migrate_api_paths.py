#!/usr/bin/env python3
"""
API Path Migration Script
Standardizes API path naming conventions across the Dexter codebase.

Conventions:
- Backend: organization_slug, project_slug (snake_case)
- Frontend TS: organizationSlug, projectSlug (camelCase)
- URL paths: {organization_slug}, {project_slug}
"""

import os
import re
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import argparse
import sys

class APIPathMigrator:
    def __init__(self, dry_run: bool = True, backup: bool = True):
        self.dry_run = dry_run
        self.backup = backup
        self.changes: List[Dict] = []
        self.backup_dir = Path(f"backup_api_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
    def log(self, message: str, level: str = "INFO"):
        """Log a message with timestamp and level."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def backup_file(self, file_path: Path):
        """Create a backup of a file before modification."""
        if self.backup and not self.dry_run:
            try:
                # Get relative path from current directory
                rel_path = file_path.relative_to(Path.cwd())
                backup_path = self.backup_dir / rel_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file_path, backup_path)
            except ValueError:
                # If relative_to fails, use the file name only
                backup_path = self.backup_dir / file_path.name
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file_path, backup_path)
            
    def record_change(self, file_path: str, line_num: int, old_content: str, new_content: str):
        """Record a change for the migration report."""
        self.changes.append({
            "file": file_path,
            "line": line_num,
            "old": old_content,
            "new": new_content
        })
        
    def migrate_backend_paths(self):
        """Migrate backend Python files to use consistent naming."""
        self.log("Migrating backend paths...")
        
        patterns = [
            # Replace projectId with project_slug in path parameters
            (r'projectId(?=["\'}\s])', 'project_slug'),
            # Replace organizationId with organization_slug in path parameters
            (r'organizationId(?=["\'}\s])', 'organization_slug'),
            # Replace project_id with project_slug in function parameters
            (r'project_id(?=\s*:)', 'project_slug'),
            # Replace organization_id with organization_slug in function parameters
            (r'organization_id(?=\s*:)', 'organization_slug'),
        ]
        
        backend_files = list(Path("backend").rglob("*.py"))
        
        for file_path in backend_files:
            if "migration" in str(file_path) or "__pycache__" in str(file_path):
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8')
                original_content = content
                
                for pattern, replacement in patterns:
                    content = re.sub(pattern, replacement, content)
                
                if content != original_content:
                    self.log(f"Updating {file_path}")
                    self.backup_file(file_path)
                    
                    if not self.dry_run:
                        file_path.write_text(content, encoding='utf-8')
                    
                    # Record changes
                    lines = original_content.split('\n')
                    new_lines = content.split('\n')
                    for i, (old_line, new_line) in enumerate(zip(lines, new_lines)):
                        if old_line != new_line:
                            self.record_change(str(file_path), i + 1, old_line.strip(), new_line.strip())
                            
            except Exception as e:
                self.log(f"Error processing {file_path}: {e}", "ERROR")
                
    def migrate_frontend_typescript(self):
        """Migrate frontend TypeScript files to use consistent naming."""
        self.log("Migrating frontend TypeScript files...")
        
        patterns = [
            # Replace projectID with projectSlug in interfaces
            (r'projectID(?=\??:)', 'projectSlug'),
            # Replace organizationID with organizationSlug in interfaces
            (r'organizationID(?=\??:)', 'organizationSlug'),
            # Replace project_id with projectSlug in camelCase contexts
            (r'project_id(?=[\s,\)}])', 'projectSlug'),
            # Replace organization_id with organizationSlug in camelCase contexts
            (r'organization_id(?=[\s,\)}])', 'organizationSlug'),
        ]
        
        frontend_files = []
        for ext in ['*.ts', '*.tsx']:
            frontend_files.extend(Path("frontend/src").rglob(ext))
        
        for file_path in frontend_files:
            if "node_modules" in str(file_path) or "dist" in str(file_path):
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8')
                original_content = content
                
                for pattern, replacement in patterns:
                    content = re.sub(pattern, replacement, content)
                
                if content != original_content:
                    self.log(f"Updating {file_path}")
                    self.backup_file(file_path)
                    
                    if not self.dry_run:
                        file_path.write_text(content, encoding='utf-8')
                    
                    # Record changes
                    lines = original_content.split('\n')
                    new_lines = content.split('\n')
                    for i, (old_line, new_line) in enumerate(zip(lines, new_lines)):
                        if old_line != new_line:
                            self.record_change(str(file_path), i + 1, old_line.strip(), new_line.strip())
                            
            except Exception as e:
                self.log(f"Error processing {file_path}: {e}", "ERROR")
                
    def migrate_api_path_templates(self):
        """Migrate API path templates to use consistent placeholders."""
        self.log("Migrating API path templates...")
        
        patterns = [
            # Replace {projectId} with {project_slug}
            (r'\{projectId\}', '{project_slug}'),
            # Replace {organizationId} with {organization_slug}
            (r'\{organizationId\}', '{organization_slug}'),
            # Replace :projectId with :project_slug
            (r':projectId', ':project_slug'),
            # Replace :organizationId with :organization_slug
            (r':organizationId', ':organization_slug'),
        ]
        
        # Search in both backend and frontend configuration files
        config_files = []
        config_files.extend(Path("backend").rglob("*.yaml"))
        config_files.extend(Path("backend").rglob("*.yml"))
        config_files.extend(Path("frontend/src").rglob("*api*.ts"))
        config_files.extend(Path("frontend/src").rglob("*api*.tsx"))
        
        for file_path in config_files:
            try:
                content = file_path.read_text(encoding='utf-8')
                original_content = content
                
                for pattern, replacement in patterns:
                    content = re.sub(pattern, replacement, content)
                
                if content != original_content:
                    self.log(f"Updating {file_path}")
                    self.backup_file(file_path)
                    
                    if not self.dry_run:
                        file_path.write_text(content, encoding='utf-8')
                    
                    # Record changes
                    lines = original_content.split('\n')
                    new_lines = content.split('\n')
                    for i, (old_line, new_line) in enumerate(zip(lines, new_lines)):
                        if old_line != new_line:
                            self.record_change(str(file_path), i + 1, old_line.strip(), new_line.strip())
                            
            except Exception as e:
                self.log(f"Error processing {file_path}: {e}", "ERROR")
                
    def create_rollback_script(self):
        """Create a rollback script to undo the migration."""
        if not self.changes:
            return
            
        rollback_script = """#!/usr/bin/env python3
# Rollback script for API path migration
import os
import shutil
from pathlib import Path

def rollback():
    backup_dir = Path("{backup_dir}")
    if not backup_dir.exists():
        print("Backup directory not found!")
        return
        
    for backup_file in backup_dir.rglob("*"):
        if backup_file.is_file():
            original_path = Path.cwd() / backup_file.relative_to(backup_dir)
            print(f"Restoring {original_path}")
            shutil.copy2(backup_file, original_path)
            
    print("Rollback complete!")
    
if __name__ == "__main__":
    rollback()
""".format(backup_dir=self.backup_dir)
        
        rollback_path = Path("rollback_api_migration.py")
        rollback_path.write_text(rollback_script)
        rollback_path.chmod(0o755)
        self.log(f"Created rollback script: {rollback_path}")
        
    def generate_report(self):
        """Generate a migration report."""
        report = {
            "timestamp": datetime.now().isoformat(),
            "dry_run": self.dry_run,
            "total_changes": len(self.changes),
            "affected_files": len(set(c["file"] for c in self.changes)),
            "changes": self.changes
        }
        
        report_path = Path(f"api_migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        self.log(f"Migration report saved to: {report_path}")
        
        # Print summary
        print("\n" + "="*50)
        print(f"Migration Summary:")
        print(f"  Total changes: {report['total_changes']}")
        print(f"  Affected files: {report['affected_files']}")
        print(f"  Dry run: {report['dry_run']}")
        if not self.dry_run and self.backup:
            print(f"  Backup directory: {self.backup_dir}")
        print("="*50 + "\n")
        
    def run(self):
        """Run the complete migration process."""
        self.log(f"Starting API path migration (dry_run={self.dry_run})")
        
        # Create backup directory if needed
        if self.backup and not self.dry_run:
            self.backup_dir.mkdir(exist_ok=True)
        
        # Run migrations
        self.migrate_backend_paths()
        self.migrate_frontend_typescript()
        self.migrate_api_path_templates()
        
        # Create rollback script if not dry run
        if not self.dry_run and self.backup:
            self.create_rollback_script()
        
        # Generate report
        self.generate_report()
        
        if self.dry_run:
            self.log("Dry run complete. Run with --execute to apply changes.")
        else:
            self.log("Migration complete!")


def main():
    parser = argparse.ArgumentParser(description="Migrate API paths to consistent naming")
    parser.add_argument("--execute", action="store_true", help="Execute the migration (default is dry run)")
    parser.add_argument("--no-backup", action="store_true", help="Skip creating backups")
    
    args = parser.parse_args()
    
    migrator = APIPathMigrator(
        dry_run=not args.execute,
        backup=not args.no_backup
    )
    
    try:
        migrator.run()
    except KeyboardInterrupt:
        print("\nMigration interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nMigration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()