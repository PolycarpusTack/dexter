#!/usr/bin/env python3
"""
Test suite for API path migration script.
Tests migration patterns and ensures correct replacements.
"""

import unittest
import tempfile
import shutil
from pathlib import Path
import json
import sys
import os

# Add parent directory to path to import the migration script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from migrate_api_paths import APIPathMigrator


class TestAPIPathMigration(unittest.TestCase):
    def setUp(self):
        """Set up test environment."""
        self.test_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)
        
        # Create test directory structure
        Path("backend/app/routers").mkdir(parents=True)
        Path("backend/app/services").mkdir(parents=True)
        Path("frontend/src/api").mkdir(parents=True)
        Path("frontend/src/types").mkdir(parents=True)
        
    def tearDown(self):
        """Clean up test environment."""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir)
        
    def create_test_file(self, path: str, content: str):
        """Create a test file with given content."""
        file_path = Path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)
        return file_path
        
    def test_backend_path_parameter_migration(self):
        """Test migration of backend path parameters."""
        test_content = '''
@router.get("/organizations/{organizationId}/projects/{projectId}/issues")
async def get_issues(organizationId: str, projectId: str):
    """Get issues for organization and project."""
    return await fetch_issues(organization_id=organizationId, project_id=projectId)
'''
        
        expected_content = '''
@router.get("/organizations/{organization_slug}/projects/{project_slug}/issues")
async def get_issues(organization_slug: str, project_slug: str):
    """Get issues for organization and project."""
    return await fetch_issues(organization_id=organization_slug, project_id=project_slug)
'''
        
        file_path = self.create_test_file("backend/app/routers/test.py", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=False)
        migrator.migrate_backend_paths()
        
        result = file_path.read_text()
        self.assertEqual(result.strip(), expected_content.strip())
        
    def test_frontend_interface_migration(self):
        """Test migration of frontend TypeScript interfaces."""
        test_content = '''
export interface IssueParams {
    organizationID: string;
    projectID?: string;
    issueId: string;
}

export interface EventData {
    project_id: string;
    organization_id: string;
    eventId: string;
}
'''
        
        expected_content = '''
export interface IssueParams {
    organizationSlug: string;
    projectSlug?: string;
    issueId: string;
}

export interface EventData {
    projectSlug: string;
    organizationSlug: string;
    eventId: string;
}
'''
        
        file_path = self.create_test_file("frontend/src/types/test.ts", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=False)
        migrator.migrate_frontend_typescript()
        
        result = file_path.read_text()
        self.assertEqual(result.strip(), expected_content.strip())
        
    def test_api_path_template_migration(self):
        """Test migration of API path templates."""
        test_content = '''
const API_PATHS = {
    issues: '/organizations/{organizationId}/projects/{projectId}/issues',
    events: '/organizations/{organizationId}/projects/{projectId}/events/{eventId}',
    metrics: '/organizations/:organizationId/metrics'
};
'''
        
        expected_content = '''
const API_PATHS = {
    issues: '/organizations/{organization_slug}/projects/{project_slug}/issues',
    events: '/organizations/{organization_slug}/projects/{project_slug}/events/{eventId}',
    metrics: '/organizations/:organization_slug/metrics'
};
'''
        
        file_path = self.create_test_file("frontend/src/api/paths.ts", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=False)
        migrator.migrate_api_path_templates()
        
        result = file_path.read_text()
        self.assertEqual(result.strip(), expected_content.strip())
        
    def test_yaml_configuration_migration(self):
        """Test migration of YAML configuration files."""
        test_content = '''
endpoints:
  issues:
    path: /organizations/{organizationId}/projects/{projectId}/issues
    method: GET
    parameters:
      - name: organizationId
        in: path
        required: true
      - name: projectId
        in: path
        required: true
'''
        
        expected_content = '''
endpoints:
  issues:
    path: /organizations/{organization_slug}/projects/{project_slug}/issues
    method: GET
    parameters:
      - name: organizationId
        in: path
        required: true
      - name: projectId
        in: path
        required: true
'''
        
        file_path = self.create_test_file("backend/config/api.yaml", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=False)
        migrator.migrate_api_path_templates()
        
        result = file_path.read_text()
        self.assertEqual(result.strip(), expected_content.strip())
        
    def test_dry_run_mode(self):
        """Test that dry run mode doesn't modify files."""
        test_content = 'const projectID = "test";'
        file_path = self.create_test_file("frontend/src/test.ts", test_content)
        
        migrator = APIPathMigrator(dry_run=True, backup=False)
        migrator.migrate_frontend_typescript()
        
        result = file_path.read_text()
        self.assertEqual(result, test_content)  # Should be unchanged
        
    def test_backup_creation(self):
        """Test that backups are created correctly."""
        test_content = 'const projectID = "test";'
        file_path = self.create_test_file("frontend/src/test.ts", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=True)
        migrator.migrate_frontend_typescript()
        
        # Check that backup directory was created
        self.assertTrue(migrator.backup_dir.exists())
        
        # Check that backup file exists
        backup_file = migrator.backup_dir / "frontend/src/test.ts"
        self.assertTrue(backup_file.exists())
        self.assertEqual(backup_file.read_text(), test_content)
        
    def test_report_generation(self):
        """Test that migration report is generated correctly."""
        test_content = 'const projectID = "test";'
        self.create_test_file("frontend/src/test.ts", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=False)
        migrator.migrate_frontend_typescript()
        migrator.generate_report()
        
        # Check that report file was created
        report_files = list(Path.cwd().glob("api_migration_report_*.json"))
        self.assertEqual(len(report_files), 1)
        
        # Check report content
        with open(report_files[0]) as f:
            report = json.load(f)
            
        self.assertIn("timestamp", report)
        self.assertEqual(report["dry_run"], False)
        self.assertGreater(report["total_changes"], 0)
        self.assertGreater(report["affected_files"], 0)
        self.assertIsInstance(report["changes"], list)
        
    def test_complex_migration_scenario(self):
        """Test a complex migration scenario with multiple patterns."""
        test_content = '''
// API client with mixed naming conventions
export class APIClient {
    async getIssues(organizationID: string, projectID: string) {
        const path = `/organizations/{organizationId}/projects/{projectId}/issues`;
        return this.fetch(path, {
            organization_id: organizationID,
            project_id: projectID
        });
    }
    
    async getEvents(params: {
        organization_id: string;
        project_id: string;
        eventId: string;
    }) {
        const { organization_id, project_id, eventId } = params;
        const url = `/orgs/:organizationId/projects/:projectId/events/${eventId}`;
        return this.fetch(url);
    }
}
'''
        
        file_path = self.create_test_file("frontend/src/api/client.ts", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=False)
        migrator.migrate_frontend_typescript()
        migrator.migrate_api_path_templates()
        
        result = file_path.read_text()
        
        # Check that various patterns were migrated
        self.assertIn("organizationSlug: string", result)
        self.assertIn("projectSlug: string", result)
        self.assertIn("{organization_slug}", result)
        self.assertIn("{project_slug}", result)
        self.assertIn(":organization_slug", result)
        self.assertIn(":project_slug", result)
        
        # Check that camelCase context was preserved
        self.assertNotIn("organization_slug: string", result)  # Should be camelCase in TS
        
    def test_rollback_script_creation(self):
        """Test that rollback script is created correctly."""
        test_content = 'const projectID = "test";'
        self.create_test_file("frontend/src/test.ts", test_content)
        
        migrator = APIPathMigrator(dry_run=False, backup=True)
        migrator.migrate_frontend_typescript()
        migrator.create_rollback_script()
        
        # Check that rollback script was created
        rollback_script = Path("rollback_api_migration.py")
        self.assertTrue(rollback_script.exists())
        
        # Check that it's executable
        self.assertTrue(os.access(rollback_script, os.X_OK))


class TestMigrationPatterns(unittest.TestCase):
    """Test specific regex patterns used in migration."""
    
    def test_backend_patterns(self):
        """Test backend migration patterns."""
        migrator = APIPathMigrator()
        
        test_cases = [
            ('projectId"', 'project_slug"'),
            ("projectId'", "project_slug'"),
            ('projectId}', 'project_slug}'),
            ('projectId ', 'project_slug '),
            ('organizationId"', 'organization_slug"'),
            ('project_id:', 'project_slug:'),
            ('organization_id:', 'organization_slug:'),
        ]
        
        patterns = [
            (r'projectId(?=["\'}\s])', 'project_slug'),
            (r'organizationId(?=["\'}\s])', 'organization_slug'),
            (r'project_id(?=\s*:)', 'project_slug'),
            (r'organization_id(?=\s*:)', 'organization_slug'),
        ]
        
        for test_input, expected in test_cases:
            result = test_input
            for pattern, replacement in patterns:
                result = re.sub(pattern, replacement, result)
            self.assertEqual(result, expected, f"Failed for input: {test_input}")
            
    def test_frontend_patterns(self):
        """Test frontend migration patterns."""
        migrator = APIPathMigrator()
        
        test_cases = [
            ('projectID:', 'projectSlug:'),
            ('projectID?:', 'projectSlug?:'),
            ('organizationID:', 'organizationSlug:'),
            ('project_id ', 'projectSlug '),
            ('project_id,', 'projectSlug,'),
            ('project_id)', 'projectSlug)'),
            ('organization_id}', 'organizationSlug}'),
        ]
        
        patterns = [
            (r'projectID(?=\??:)', 'projectSlug'),
            (r'organizationID(?=\??:)', 'organizationSlug'),
            (r'project_id(?=[\s,\)}])', 'projectSlug'),
            (r'organization_id(?=[\s,\)}])', 'organizationSlug'),
        ]
        
        for test_input, expected in test_cases:
            result = test_input
            for pattern, replacement in patterns:
                result = re.sub(pattern, replacement, result)
            self.assertEqual(result, expected, f"Failed for input: {test_input}")
            
    def test_path_template_patterns(self):
        """Test API path template patterns."""
        migrator = APIPathMigrator()
        
        test_cases = [
            ('{projectId}', '{project_slug}'),
            ('{organizationId}', '{organization_slug}'),
            (':projectId', ':project_slug'),
            (':organizationId', ':organization_slug'),
        ]
        
        patterns = [
            (r'\{projectId\}', '{project_slug}'),
            (r'\{organizationId\}', '{organization_slug}'),
            (r':projectId', ':project_slug'),
            (r':organizationId', ':organization_slug'),
        ]
        
        for test_input, expected in test_cases:
            result = test_input
            for pattern, replacement in patterns:
                result = re.sub(pattern, replacement, result)
            self.assertEqual(result, expected, f"Failed for input: {test_input}")


if __name__ == '__main__':
    # Import re for pattern testing
    import re
    
    unittest.main()