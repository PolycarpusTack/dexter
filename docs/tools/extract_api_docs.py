#!/usr/bin/env python3
"""
API Documentation Extractor for Dexter Project.

This script extracts API specifications from OpenAPI/Swagger files
and generates Markdown documentation files.
"""

import os
import json
import yaml
import glob
import re
from typing import Dict, Any, List, Optional
from rich.console import Console

console = Console()

def load_openapi_spec(spec_path: str) -> Dict[str, Any]:
    """Load an OpenAPI specification from file"""
    with open(spec_path, 'r', encoding='utf-8') as f:
        if spec_path.endswith('.yaml') or spec_path.endswith('.yml'):
            return yaml.safe_load(f)
        elif spec_path.endswith('.json'):
            return json.load(f)
        else:
            raise ValueError(f"Unsupported file format: {spec_path}")


def generate_endpoint_doc(path: str, methods: Dict[str, Any], spec: Dict[str, Any], output_dir: str) -> str:
    """Generate documentation for a single endpoint"""
    
    # Create a suitable filename from the path
    filename = path.replace('/', '_').replace('{', '').replace('}', '').strip('_')
    if filename == '':
        filename = 'root'
    filename = f"{filename}.md"
    
    # Parse the first method to get a title
    first_method = next(iter(methods.values()))
    title = first_method.get('summary', path)
    
    content = f"# {title}\n\n"
    
    for method, details in methods.items():
        method_upper = method.upper()
        
        content += f"## {method_upper} {path}\n\n"
        
        # Add summary and description
        if 'summary' in details:
            content += f"**Summary:** {details['summary']}\n\n"
        
        if 'description' in details:
            content += f"**Description:** {details['description']}\n\n"
        
        # Add Parameters
        if 'parameters' in details and details['parameters']:
            content += "### Parameters\n\n"
            content += "| Name | In | Type | Required | Description |\n"
            content += "|------|----|----|----------|-------------|\n"
            
            for param in details['parameters']:
                param_type = param.get('schema', {}).get('type', '-')
                if 'enum' in param.get('schema', {}):
                    enum_values = ', '.join([f'`{v}`' for v in param['schema']['enum']])
                    param_type = f"{param_type} ({enum_values})"
                
                content += f"| {param.get('name', '-')} | {param.get('in', '-')} | {param_type} | {param.get('required', False)} | {param.get('description', '-')} |\n"
            
            content += "\n"
        
        # Add Request Body
        if 'requestBody' in details:
            content += "### Request Body\n\n"
            content_types = details['requestBody'].get('content', {})
            
            for content_type, content_details in content_types.items():
                content += f"**Content Type:** `{content_type}`\n\n"
                
                if 'schema' in content_details:
                    schema = content_details['schema']
                    
                    # Handle references
                    if '$ref' in schema:
                        ref_path = schema['$ref'].split('/')
                        ref_name = ref_path[-1]
                        schema = resolve_ref(ref_path, spec)
                        content += f"**Schema:** [{ref_name}](#schema-{ref_name.lower()})\n\n"
                    
                    # Add example if available
                    if 'example' in schema:
                        content += "**Example:**\n\n"
                        content += "```json\n"
                        content += json.dumps(schema['example'], indent=2)
                        content += "\n```\n\n"
            
                    # Add properties if available
                    if 'properties' in schema:
                        content += "**Properties:**\n\n"
                        content += "| Property | Type | Required | Description |\n"
                        content += "|----------|------|----------|-------------|\n"
                        
                        required = schema.get('required', [])
                        
                        for prop_name, prop in schema['properties'].items():
                            prop_type = prop.get('type', '-')
                            if 'enum' in prop:
                                enum_values = ', '.join([f'`{v}`' for v in prop['enum']])
                                prop_type = f"{prop_type} ({enum_values})"
                            
                            content += f"| {prop_name} | {prop_type} | {prop_name in required} | {prop.get('description', '-')} |\n"
                        
                        content += "\n"
        
        # Add Responses
        if 'responses' in details:
            content += "### Responses\n\n"
            
            for status, response in details['responses'].items():
                content += f"**Status Code {status}**\n\n"
                
                if 'description' in response:
                    content += f"{response['description']}\n\n"
                
                if 'content' in response:
                    for content_type, content_details in response['content'].items():
                        content += f"**Content Type:** `{content_type}`\n\n"
                        
                        if 'schema' in content_details:
                            schema = content_details['schema']
                            
                            # Handle references
                            if '$ref' in schema:
                                ref_path = schema['$ref'].split('/')
                                ref_name = ref_path[-1]
                                schema = resolve_ref(ref_path, spec)
                                content += f"**Schema:** [{ref_name}](#schema-{ref_name.lower()})\n\n"
                            
                            # Add example if available
                            if 'example' in schema:
                                content += "**Example:**\n\n"
                                content += "```json\n"
                                content += json.dumps(schema['example'], indent=2)
                                content += "\n```\n\n"
                                
                            # Add properties if available
                            if 'properties' in schema:
                                content += "**Properties:**\n\n"
                                content += "| Property | Type | Required | Description |\n"
                                content += "|----------|------|----------|-------------|\n"
                                
                                required = schema.get('required', [])
                                
                                for prop_name, prop in schema['properties'].items():
                                    prop_type = prop.get('type', '-')
                                    if 'enum' in prop:
                                        enum_values = ', '.join([f'`{v}`' for v in prop['enum']])
                                        prop_type = f"{prop_type} ({enum_values})"
                                    
                                    content += f"| {prop_name} | {prop_type} | {prop_name in required} | {prop.get('description', '-')} |\n"
                                
                                content += "\n"
        
        content += "\n---\n\n"
    
    # Add implementation status section
    content += "## Implementation Status\n\n"
    content += "- [ ] Backend implementation complete\n"
    content += "- [ ] Frontend integration complete\n"
    content += "- [ ] Tests written\n"
    content += "- [ ] Documentation complete\n\n"
    
    # Add last updated field
    content += "## Last Updated\n\n"
    content += f"{os.environ.get('DATE', '2025-05-12')} by Documentation System\n"
    
    # Write the file
    output_path = os.path.join(output_dir, filename)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return filename


def resolve_ref(ref_path: List[str], spec: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve a JSON reference within the OpenAPI spec"""
    if ref_path[0] == '#':
        # Local reference
        current = spec
        for component in ref_path[1:]:
            current = current.get(component, {})
        return current
    else:
        # External reference not supported yet
        return {}


def generate_schema_docs(spec: Dict[str, Any], output_dir: str) -> None:
    """Generate documentation for schemas in the spec"""
    if 'components' not in spec or 'schemas' not in spec['components']:
        return
    
    schemas = spec['components']['schemas']
    
    content = "# API Schemas\n\n"
    content += "This document contains schema definitions used across the API.\n\n"
    
    for schema_name, schema in schemas.items():
        content += f"## Schema: {schema_name}\n\n"
        
        if 'description' in schema:
            content += f"{schema['description']}\n\n"
        
        if 'type' in schema:
            content += f"**Type:** {schema['type']}\n\n"
        
        if 'properties' in schema:
            content += "### Properties\n\n"
            content += "| Property | Type | Required | Description |\n"
            content += "|----------|------|----------|-------------|\n"
            
            required = schema.get('required', [])
            
            for prop_name, prop in schema['properties'].items():
                prop_type = prop.get('type', '-')
                
                # Handle references in properties
                if '$ref' in prop:
                    ref_path = prop['$ref'].split('/')
                    ref_name = ref_path[-1]
                    prop_type = f"[{ref_name}](#schema-{ref_name.lower()})"
                
                if 'enum' in prop:
                    enum_values = ', '.join([f'`{v}`' for v in prop['enum']])
                    prop_type = f"{prop_type} ({enum_values})"
                
                content += f"| {prop_name} | {prop_type} | {prop_name in required} | {prop.get('description', '-')} |\n"
            
            content += "\n"
        
        if 'enum' in schema:
            content += "### Enum Values\n\n"
            for enum_value in schema['enum']:
                content += f"- `{enum_value}`\n"
            content += "\n"
        
        if 'example' in schema:
            content += "### Example\n\n"
            content += "```json\n"
            content += json.dumps(schema['example'], indent=2)
            content += "\n```\n\n"
        
        content += "---\n\n"
    
    # Write schemas file
    with open(os.path.join(output_dir, "schemas.md"), 'w', encoding='utf-8') as f:
        f.write(content)


def generate_api_index(spec: Dict[str, Any], endpoint_files: Dict[str, str], output_dir: str) -> None:
    """Generate an index file for the API documentation"""
    content = f"# {spec.get('info', {}).get('title', 'API Documentation')}\n\n"
    
    # Add info section
    if 'info' in spec:
        if 'description' in spec['info']:
            content += f"{spec['info']['description']}\n\n"
        
        if 'version' in spec['info']:
            content += f"**Version:** {spec['info']['version']}\n\n"
    
    # Add endpoints section
    content += "## Endpoints\n\n"
    
    # Group endpoints by tag
    endpoints_by_tag = {}
    
    for path, methods in spec.get('paths', {}).items():
        for method, details in methods.items():
            method_upper = method.upper()
            tags = details.get('tags', ['default'])
            
            for tag in tags:
                if tag not in endpoints_by_tag:
                    endpoints_by_tag[tag] = []
                
                summary = details.get('summary', path)
                filename = endpoint_files.get(f"{path}:{method}", '')
                
                endpoints_by_tag[tag].append({
                    'path': path,
                    'method': method_upper,
                    'summary': summary,
                    'filename': filename
                })
    
    # Generate table of contents by tag
    for tag, endpoints in sorted(endpoints_by_tag.items()):
        content += f"### {tag}\n\n"
        
        for endpoint in sorted(endpoints, key=lambda e: e['path']):
            filename = endpoint['filename']
            content += f"- [{endpoint['method']} {endpoint['path']}]({filename})"
            
            if endpoint['summary'] and endpoint['summary'] != endpoint['path']:
                content += f" - {endpoint['summary']}"
            
            content += "\n"
        
        content += "\n"
    
    # Add schema reference
    content += "## Schemas\n\n"
    content += "See [API Schemas](schemas.md) for detailed schema definitions.\n\n"
    
    # Write index file
    with open(os.path.join(output_dir, "index.md"), 'w', encoding='utf-8') as f:
        f.write(content)


def extract_api_docs():
    """
    Extract API documentation from OpenAPI specs
    and generate Markdown documentation
    """
    console.print("[bold]Extracting API Documentation from OpenAPI specs...[/bold]")
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Find spec files
    spec_files = glob.glob(f"{project_dir}/**/*.yaml", recursive=True)
    spec_files += glob.glob(f"{project_dir}/**/*.yml", recursive=True)
    spec_files += glob.glob(f"{project_dir}/**/*.json", recursive=True)
    
    spec_files = [f for f in spec_files if re.search(r'(openapi|swagger|api[-_]?spec|sentry[-_]?api)', os.path.basename(f).lower())]
    
    if not spec_files:
        console.print("[bold red]No OpenAPI specification files found![/bold red]")
        console.print("Looking for files named *openapi*.yaml, *swagger*.json, *api-spec*.yaml, etc.")
        return
    
    for spec_file in spec_files:
        try:
            spec_name = os.path.splitext(os.path.basename(spec_file))[0]
            console.print(f"Processing API spec: [bold]{spec_name}[/bold]")
            
            # Create output directory
            output_dir = os.path.join(project_dir, "docs", "api", spec_name)
            os.makedirs(output_dir, exist_ok=True)
            
            # Load spec
            spec = load_openapi_spec(spec_file)
            
            # Process each endpoint
            endpoint_files = {}
            
            for path, methods in spec.get('paths', {}).items():
                for method in methods:
                    endpoint_key = f"{path}:{method}"
                    filename = generate_endpoint_doc(path, {method: methods[method]}, spec, output_dir)
                    endpoint_files[endpoint_key] = filename
                    console.print(f"  Generated documentation for [green]{method.upper()} {path}[/green]")
            
            # Generate schemas documentation
            generate_schema_docs(spec, output_dir)
            console.print("  Generated schemas documentation")
            
            # Generate index
            generate_api_index(spec, endpoint_files, output_dir)
            console.print("  Generated API index")
            
            console.print(f"✅ API documentation generated in [bold]docs/api/{spec_name}/[/bold]")
        
        except Exception as e:
            console.print(f"[bold red]Error processing {spec_file}:[/bold red] {str(e)}")


if __name__ == "__main__":
    extract_api_docs()
