from typing import Dict, Any, Optional
import re
from app.config.api_paths import ApiPathConfig, PathMapping


class PathResolver:
    """Utility class for resolving API paths with template substitution."""
    
    @staticmethod
    def resolve(template: str, **kwargs) -> str:
        """
        Resolve a path template with provided parameters.
        
        Args:
            template: Path template with {placeholder} syntax
            **kwargs: Values to substitute into the template
            
        Returns:
            Resolved path string
            
        Raises:
            ValueError: If required placeholders are missing
        """
        # Find all placeholders in the template
        placeholders = re.findall(r'{([^}]+)}', template)
        
        # Prepare parameters with fallbacks
        params = kwargs.copy()
        
        # Handle common parameter mappings
        if 'org' in params and 'organization_slug' not in params:
            params['organization_slug'] = params['org']
        
        if 'project' in params and 'project_slug' not in params:
            params['project_slug'] = params['project']
            
        if 'team' in params and 'team_slug' not in params:
            params['team_slug'] = params['team']
        
        # Check for missing required placeholders
        missing = []
        for placeholder in placeholders:
            if placeholder not in params:
                missing.append(placeholder)
        
        if missing:
            raise ValueError(f"Missing required path parameters: {', '.join(missing)}")
        
        # Perform substitution
        resolved = template
        for placeholder in placeholders:
            value = params.get(placeholder)
            if value is not None:
                resolved = resolved.replace(f"{{{placeholder}}}", str(value))
        
        return resolved
    
    @staticmethod
    def resolve_mapping(mapping: PathMapping, path_type: str = 'sentry', **kwargs) -> str:
        """
        Resolve a path from a PathMapping object.
        
        Args:
            mapping: PathMapping object containing path templates
            path_type: Which path to resolve ('frontend', 'backend', 'sentry')
            **kwargs: Values to substitute into the template
            
        Returns:
            Resolved path string
        """
        if path_type == 'frontend':
            template = mapping.frontend_path
        elif path_type == 'backend':
            template = mapping.backend_path
        elif path_type == 'sentry':
            template = mapping.sentry_path
        else:
            raise ValueError(f"Invalid path type: {path_type}")
        
        return PathResolver.resolve(template, **kwargs)
    
    @staticmethod
    def extract_parameters(path: str, template: str) -> Dict[str, str]:
        """
        Extract parameters from a path based on a template.
        
        Args:
            path: Actual path to extract parameters from
            template: Template pattern with {placeholder} syntax
            
        Returns:
            Dictionary of extracted parameters
        """
        # Convert template to regex pattern
        pattern = template
        placeholders = re.findall(r'{([^}]+)}', template)
        
        for placeholder in placeholders:
            # Replace placeholder with named capture group
            pattern = pattern.replace(f"{{{placeholder}}}", f"(?P<{placeholder}>[^/]+)")
        
        # Escape special regex characters in the rest of the pattern
        pattern = re.escape(pattern)
        # Unescape the named groups we just added
        pattern = pattern.replace(r'\(\?P\<', '(?P<').replace(r'\>', '>')
        
        # Add anchors
        pattern = f"^{pattern}$"
        
        # Try to match
        match = re.match(pattern, path)
        if match:
            return match.groupdict()
        else:
            return {}
    
    @staticmethod
    def get_sentry_url(path: str) -> str:
        """Get full Sentry API URL."""
        return ApiPathConfig.get_sentry_url(path)
    
    @staticmethod
    def find_matching_route(path: str) -> Optional[tuple[str, str, PathMapping]]:
        """
        Find a matching route for a given path.
        
        Args:
            path: Path to match against available routes
            
        Returns:
            Tuple of (category, operation, PathMapping) if found, None otherwise
        """
        all_paths = ApiPathConfig.get_all_paths()
        
        for category, operations in all_paths.items():
            for operation, mapping in operations.items():
                # Try matching against frontend, backend, and sentry paths
                for path_attr in ['frontend_path', 'backend_path', 'sentry_path']:
                    template = getattr(mapping, path_attr)
                    params = PathResolver.extract_parameters(path, template)
                    if params:  # If we got a match
                        return category, operation, mapping
        
        return None
    
    @staticmethod
    def validate_path_params(template: str, params: Dict[str, Any]) -> tuple[bool, list[str]]:
        """
        Validate that all required parameters for a path template are provided.
        
        Args:
            template: Path template with {placeholder} syntax
            params: Parameters to validate
            
        Returns:
            Tuple of (is_valid, missing_params)
        """
        placeholders = re.findall(r'{([^}]+)}', template)
        
        # Prepare parameters with fallbacks
        resolved_params = params.copy()
        
        # Handle common parameter mappings
        if 'org' in resolved_params and 'organization_slug' not in resolved_params:
            resolved_params['organization_slug'] = resolved_params['org']
        
        if 'project' in resolved_params and 'project_slug' not in resolved_params:
            resolved_params['project_slug'] = resolved_params['project']
            
        if 'team' in resolved_params and 'team_slug' not in resolved_params:
            resolved_params['team_slug'] = resolved_params['team']
        
        # Check for missing parameters
        missing = []
        for placeholder in placeholders:
            if placeholder not in resolved_params:
                missing.append(placeholder)
        
        return len(missing) == 0, missing
