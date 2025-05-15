"""
Service for managing prompt templates.
"""
import json
import logging
import os
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime
import uuid
import re
from semver import Version

from app.models.template_models import (
    PromptTemplate,
    TemplateCategory,
    TemplateType,
    TemplateVariable,
    TemplateVersion,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    TemplateSearchRequest
)
from app.core.config import settings

logger = logging.getLogger(__name__)

class TemplateService:
    """Service for managing templates."""
    
    def __init__(self, templates_dir: Optional[str] = None):
        """
        Initialize the template service.
        
        Args:
            templates_dir: Directory where templates are stored. Defaults to the configured templates directory.
        """
        self.templates_dir = templates_dir or settings.templates_dir
        self.templates: Dict[str, PromptTemplate] = {}
        self._ensure_templates_dir()
        self._load_templates()
        self._load_default_templates()
        
    def _ensure_templates_dir(self) -> None:
        """Ensure that the templates directory exists."""
        os.makedirs(self.templates_dir, exist_ok=True)
        
    def _load_templates(self) -> None:
        """Load templates from the templates directory."""
        try:
            # Iterate through template files in the directory
            for filename in os.listdir(self.templates_dir):
                if filename.endswith('.json'):
                    template_path = os.path.join(self.templates_dir, filename)
                    try:
                        with open(template_path, 'r', encoding='utf-8') as f:
                            template_data = json.load(f)
                            template = PromptTemplate(**template_data)
                            self.templates[template.id] = template
                    except Exception as e:
                        logger.error(f"Failed to load template from {template_path}: {e}")
                        
            logger.info(f"Loaded {len(self.templates)} templates from {self.templates_dir}")
        except Exception as e:
            logger.error(f"Failed to load templates: {e}")
            
    def _save_template(self, template: PromptTemplate) -> None:
        """Save a template to disk."""
        try:
            template_path = os.path.join(self.templates_dir, f"{template.id}.json")
            with open(template_path, 'w', encoding='utf-8') as f:
                f.write(template.json(exclude_none=True, indent=2))
                
            logger.info(f"Saved template {template.id} to {template_path}")
        except Exception as e:
            logger.error(f"Failed to save template {template.id}: {e}")
            raise
            
    def _load_default_templates(self) -> None:
        """Load default templates if no templates are found."""
        if not self.templates:
            logger.info("No templates found. Loading default templates.")
            # Create default templates for different error categories
            self._create_default_templates()
            
    def _create_default_templates(self) -> None:
        """Create and save default templates."""
        default_templates = [
            # General Error Template
            {
                "name": "General Error Explanation",
                "description": "General-purpose template for explaining any error",
                "category": TemplateCategory.GENERAL,
                "type": TemplateType.SYSTEM,
                "content": """You are an expert software engineer specializing in diagnosing and fixing errors. 
You have deep knowledge of common error patterns across many languages and frameworks.

When analyzing the error, follow these steps:
1. Identify the error type and category
2. Explain the likely root cause in simple terms
3. Suggest potential solutions or workarounds
4. Provide guidance on how to diagnose similar issues in the future

Focus on being clear, practical, and educational.
""",
                "variables": [],
                "is_default": True,
                "is_public": True,
                "tags": ["general", "error", "explanation"]
            },
            
            # Database Error Template
            {
                "name": "Database Error Analysis",
                "description": "Template for analyzing database-related errors",
                "category": TemplateCategory.DATABASE,
                "type": TemplateType.SYSTEM,
                "content": """You are a database expert specializing in diagnosing and fixing database-related errors.
You have extensive knowledge of SQL, database systems, connection issues, query optimization, and data integrity problems.

When analyzing the database error, follow these steps:
1. Identify the specific database error type (connection, query, constraint, deadlock, etc.)
2. Explain the likely cause in terms of database operations
3. Suggest specific fixes based on the database technology involved ({db_system})
4. Provide sample code or SQL to illustrate the solution if applicable
5. Explain how to prevent similar issues in the future

Pay special attention to:
- Connection string issues and authentication problems
- SQL syntax errors and query structure problems
- Transaction isolation levels and concurrency issues
- Schema constraints and data type mismatches
- Performance issues and query optimization opportunities

Use proper database terminology but explain concepts clearly for developers who may not be database experts.
""",
                "variables": [
                    {
                        "name": "db_system",
                        "description": "Database system (MySQL, PostgreSQL, MongoDB, etc.)",
                        "required": False,
                        "default_value": "the database system",
                        "example": "PostgreSQL"
                    }
                ],
                "is_default": True,
                "is_public": True,
                "tags": ["database", "sql", "query", "connection"]
            },
            
            # Network Error Template
            {
                "name": "Network Error Analysis",
                "description": "Template for analyzing network-related errors",
                "category": TemplateCategory.NETWORK,
                "type": TemplateType.SYSTEM,
                "content": """You are a network engineering expert specializing in diagnosing and fixing network-related errors and API communication issues.
You have deep knowledge of HTTP, WebSockets, DNS, firewalls, proxies, and API integrations.

When analyzing the network error, follow these steps:
1. Identify the specific network error type (connection refused, timeout, DNS resolution, TLS/SSL, etc.)
2. Explain the likely cause in the context of the network stack
3. Suggest specific troubleshooting steps and fixes
4. Provide guidance on how to make network code more resilient

Pay special attention to:
- Connection timeouts and retry strategies
- API endpoint URL formatting and path issues
- Authentication and authorization problems
- Proxy and firewall configuration
- DNS resolution and hostname issues
- TLS/SSL certificate problems
- Content type and request/response format mismatches

Use proper networking terminology but explain concepts clearly for developers who may not be networking experts.
""",
                "variables": [],
                "is_default": True,
                "is_public": True,
                "tags": ["network", "http", "api", "connection", "timeout"]
            },
            
            # Syntax Error Template
            {
                "name": "Syntax Error Analysis",
                "description": "Template for analyzing syntax errors in code",
                "category": TemplateCategory.SYNTAX,
                "type": TemplateType.SYSTEM,
                "content": """You are a programming language expert specializing in diagnosing and fixing syntax errors.
You have deep knowledge of language grammar, parsing, and common syntax mistakes in {language}.

When analyzing the syntax error, follow these steps:
1. Identify the specific syntax issue (missing brackets, incorrect indentation, etc.)
2. Explain the language rule that was violated
3. Provide a corrected version of the code
4. Explain how to recognize and avoid similar syntax errors

Pay special attention to:
- Bracket and parenthesis matching
- Semicolons and statement terminators
- Indentation and code block structure
- String and comment formatting
- Reserved keyword usage
- Function and method call syntax

Explain the error in a way that helps the developer understand the language syntax rules better.
""",
                "variables": [
                    {
                        "name": "language",
                        "description": "Programming language (JavaScript, Python, etc.)",
                        "required": False,
                        "default_value": "the programming language",
                        "example": "JavaScript"
                    }
                ],
                "is_default": True,
                "is_public": True,
                "tags": ["syntax", "parsing", "code", "language"]
            },
            
            # Deadlock Error Template
            {
                "name": "Deadlock Analysis",
                "description": "Template for analyzing database deadlocks and concurrency issues",
                "category": TemplateCategory.DEADLOCK,
                "type": TemplateType.SYSTEM,
                "content": """You are a database concurrency expert specializing in diagnosing and resolving deadlocks and concurrency issues.
You have extensive knowledge of transaction isolation levels, locking mechanisms, and deadlock resolution strategies, especially in {db_system}.

When analyzing the deadlock, follow these steps:
1. Analyze the lock cycle and identify the resources involved
2. Explain how the deadlock occurred in terms of transaction sequence
3. Suggest changes to transaction structure, isolation levels, or query ordering
4. Provide guidance on deadlock prevention strategies

Pay special attention to:
- Transaction isolation levels and their implications
- Lock types (row, table, page) and acquisition order
- Query patterns that frequently lead to deadlocks
- Application-level concurrency control options
- Database-specific deadlock handling features

Use specific terminology from {db_system} when applicable, and provide practical solutions that balance data integrity with performance.
""",
                "variables": [
                    {
                        "name": "db_system",
                        "description": "Database system (MySQL, PostgreSQL, SQL Server, etc.)",
                        "required": False,
                        "default_value": "the database system",
                        "example": "PostgreSQL"
                    }
                ],
                "is_default": True,
                "is_public": True,
                "tags": ["deadlock", "concurrency", "transaction", "database", "locking"]
            }
        ]
        
        # Create and save each default template
        for template_data in default_templates:
            # Create initial version
            version = TemplateVersion(
                version="1.0.0",
                content=template_data.pop("content"),
                changes="Initial version"
            )
            
            # Create template with initial version
            template = self.create_template(
                CreateTemplateRequest(
                    **template_data,
                    content=version.content  # Content is passed via the request
                )
            )
            
            logger.info(f"Created default template: {template.name} ({template.id})")
    
    def list_templates(self, search_request: Optional[TemplateSearchRequest] = None) -> Tuple[List[PromptTemplate], int, Dict[TemplateCategory, int]]:
        """
        List templates with optional filtering.
        
        Args:
            search_request: Search parameters.
            
        Returns:
            Tuple of (templates, total count, category counts)
        """
        templates = list(self.templates.values())
        category_counts: Dict[TemplateCategory, int] = {}
        
        # Count templates by category
        for template in templates:
            if template.category not in category_counts:
                category_counts[template.category] = 0
            category_counts[template.category] += 1
        
        # Apply filters if search request is provided
        if search_request:
            if search_request.query:
                query = search_request.query.lower()
                templates = [
                    t for t in templates
                    if query in t.name.lower() or
                       query in t.description.lower() or
                       any(query in tag.lower() for tag in t.tags)
                ]
                
            if search_request.categories:
                templates = [t for t in templates if t.category in search_request.categories]
                
            if search_request.types:
                templates = [t for t in templates if t.type in search_request.types]
                
            if search_request.tags:
                templates = [
                    t for t in templates
                    if any(tag in t.tags for tag in search_request.tags)
                ]
                
            if search_request.author is not None:
                templates = [t for t in templates if t.author == search_request.author]
                
            if search_request.is_default is not None:
                templates = [t for t in templates if t.is_default == search_request.is_default]
                
            if search_request.is_public is not None:
                templates = [t for t in templates if t.is_public == search_request.is_public]
                
            # Apply pagination
            total = len(templates)
            templates = templates[search_request.offset:search_request.offset + search_request.limit]
            
            return templates, total, category_counts
            
        return templates, len(templates), category_counts
        
    def get_template(self, template_id: str) -> Optional[PromptTemplate]:
        """
        Get a template by ID.
        
        Args:
            template_id: ID of the template to retrieve.
            
        Returns:
            The template, or None if not found.
        """
        return self.templates.get(template_id)
        
    def create_template(self, request: CreateTemplateRequest) -> PromptTemplate:
        """
        Create a new template.
        
        Args:
            request: Template creation request.
            
        Returns:
            The created template.
        """
        # Create initial version
        initial_version = TemplateVersion(
            version="1.0.0",
            content=request.content,
            changes="Initial version"
        )
        
        # Create template with initial version
        template = PromptTemplate(
            id=str(uuid.uuid4()),
            name=request.name,
            description=request.description,
            category=request.category,
            type=request.type,
            variables=request.variables,
            versions=[initial_version],
            latest_version=initial_version.version,
            author=request.author,
            is_default=request.is_default,
            is_public=request.is_public,
            tags=request.tags,
            model_specific=request.model_specific,
            provider_specific=request.provider_specific
        )
        
        # Save template
        self.templates[template.id] = template
        self._save_template(template)
        
        return template
        
    def update_template(self, template_id: str, request: UpdateTemplateRequest) -> Optional[PromptTemplate]:
        """
        Update an existing template.
        
        Args:
            template_id: ID of the template to update.
            request: Template update request.
            
        Returns:
            The updated template, or None if not found.
        """
        template = self.get_template(template_id)
        if not template:
            return None
            
        # Update template fields
        if request.name is not None:
            template.name = request.name
            
        if request.description is not None:
            template.description = request.description
            
        if request.category is not None:
            template.category = request.category
            
        if request.type is not None:
            template.type = request.type
            
        if request.variables is not None:
            template.variables = request.variables
            
        if request.is_default is not None:
            template.is_default = request.is_default
            
        if request.is_public is not None:
            template.is_public = request.is_public
            
        if request.tags is not None:
            template.tags = request.tags
            
        if request.model_specific is not None:
            template.model_specific = request.model_specific
            
        if request.provider_specific is not None:
            template.provider_specific = request.provider_specific
            
        # Create new version if content is provided
        if request.content is not None:
            # Parse latest version using semver
            latest_version = Version.parse(template.latest_version)
            
            # Create new version with incremented patch version
            new_version = TemplateVersion(
                version=f"{latest_version.major}.{latest_version.minor}.{latest_version.patch + 1}",
                content=request.content,
                changes=request.version_changes or "Updated content"
            )
            
            # Add new version and update latest_version
            template.versions.append(new_version)
            template.latest_version = new_version.version
            
        # Update timestamp
        template.updated_at = datetime.now()
        
        # Save template
        self._save_template(template)
        
        return template
        
    def delete_template(self, template_id: str) -> bool:
        """
        Delete a template.
        
        Args:
            template_id: ID of the template to delete.
            
        Returns:
            True if the template was deleted, False if not found.
        """
        if template_id not in self.templates:
            return False
            
        # Remove from memory
        del self.templates[template_id]
        
        # Remove from disk
        try:
            template_path = os.path.join(self.templates_dir, f"{template_id}.json")
            if os.path.exists(template_path):
                os.remove(template_path)
                logger.info(f"Deleted template {template_id} from {template_path}")
        except Exception as e:
            logger.error(f"Failed to delete template file for {template_id}: {e}")
            
        return True
        
    def get_template_version(self, template_id: str, version: str) -> Optional[TemplateVersion]:
        """
        Get a specific version of a template.
        
        Args:
            template_id: ID of the template.
            version: Version to retrieve.
            
        Returns:
            The template version, or None if not found.
        """
        template = self.get_template(template_id)
        if not template:
            return None
            
        for ver in template.versions:
            if ver.version == version:
                return ver
                
        return None
        
    def render_template(self, template_id: str, variables: Dict[str, Any], version: Optional[str] = None) -> Optional[str]:
        """
        Render a template with the given variables.
        
        Args:
            template_id: ID of the template to render.
            variables: Variables to apply to the template.
            version: Specific version to render. Defaults to the latest version.
            
        Returns:
            The rendered template, or None if the template or version was not found.
        """
        template = self.get_template(template_id)
        if not template:
            return None
            
        # Use the specified version or the latest version
        template_version = None
        if version:
            template_version = self.get_template_version(template_id, version)
            if not template_version:
                return None
                
            content = template_version.content
        else:
            # Use latest version
            content = template.get_latest_content()
            
        # Apply variable substitution
        for var in template.variables:
            var_name = var.name
            var_value = variables.get(var_name, var.default_value)
            
            # Skip if variable is not required and not provided
            if not var.required and var_value is None:
                continue
                
            # Check if required variable is missing
            if var.required and var_value is None:
                raise ValueError(f"Required variable '{var_name}' is missing")
                
            # Replace variable in template
            if var_value is not None:
                content = content.replace(f"{{{var_name}}}", str(var_value))
                
        return content
        
    def find_template_by_category(self, category: TemplateCategory, type: Optional[TemplateType] = None) -> Optional[PromptTemplate]:
        """
        Find a default template for the given category and type.
        
        Args:
            category: Template category.
            type: Template type (optional).
            
        Returns:
            A default template matching the criteria, or None if not found.
        """
        matching_templates = [
            t for t in self.templates.values()
            if t.category == category and t.is_default and (type is None or t.type == type)
        ]
        
        # Sort by is_default (True first), then by latest_version (higher first)
        matching_templates.sort(
            key=lambda t: (not t.is_default, self._version_sort_key(t.latest_version)),
            reverse=True
        )
        
        return matching_templates[0] if matching_templates else None
        
    def _version_sort_key(self, version_str: str) -> tuple:
        """
        Create a sort key for version strings.
        
        Args:
            version_str: Version string (e.g., '1.2.3').
            
        Returns:
            Tuple of (major, minor, patch) as integers.
        """
        try:
            version = Version.parse(version_str)
            return (version.major, version.minor, version.patch)
        except Exception:
            # If parsing fails, return a low value
            return (0, 0, 0)


# Singleton instance
_template_service_instance = None

def get_template_service() -> TemplateService:
    """Get the template service singleton instance."""
    global _template_service_instance
    if _template_service_instance is None:
        _template_service_instance = TemplateService()
    return _template_service_instance