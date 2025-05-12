#!/usr/bin/env python3
"""
Documentation Validation Tool for Dexter Project.

This script validates that API endpoints defined in the code are properly documented.
It also checks for outdated documentation based on timestamps.
"""

import os
import re
import glob
import json
import sys
from dataclasses import dataclass
from typing import List, Dict, Set, Optional
from datetime import datetime, timedelta
from rich.console import Console
from rich.table import Table

console = Console()

@dataclass
class ApiEndpoint:
    path: str
    method: str
    description: str = ""
    
    def __hash__(self):
        return hash((self.path, self.method))

@dataclass
class ValidationResult:
    status: str  # "ok", "warning", "error"
    message: str
    file: Optional[str] = None
    details: Optional[str] = None


def extract_endpoints_from_code(backend_dir: str) -> Set[ApiEndpoint]:
    """Extract API endpoints defined in the backend code"""
    endpoints = set()
    router_files = glob.glob(f"{backend_dir}/app/routers/**/*.py", recursive=True)
    
    for file in router_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Extract router patterns with regex
            route_patterns = re.findall(r'@router\.(\w+)\(["\']([^"\']+)["\']', content)
            
            for method, path in route_patterns:
                # Try to extract a description from docstrings
                description = ""
                docstring_match = re.search(fr'@router\.{method}\(["\'{path}["\']\).*?def\s+\w+\([^)]*\):\s*["\']([^"\']+)', 
                                           content, re.DOTALL)
                if docstring_match:
                    description = docstring_match.group(1).strip()
                
                endpoints.add(ApiEndpoint(path=path, method=method, description=description))
    
    return endpoints


def extract_endpoints_from_docs(docs_dir: str) -> Set[ApiEndpoint]:
    """Extract API endpoints documented in Markdown files"""
    endpoints = set()
    api_docs = glob.glob(f"{docs_dir}/api/**/*.md", recursive=True)
    
    for doc in api_docs:
        with open(doc, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Extract URL and method from markdown
            url_match = re.search(r'\*\*URL:\*\*\s*`([^`]+)`', content)
            method_match = re.search(r'\*\*Method:\*\*\s*`([^`]+)`', content)
            
            if url_match and method_match:
                url = url_match.group(1)
                method = method_match.group(1).lower()
                
                # Extract description
                description = ""
                desc_section = re.search(r'## Description\s+([^\n#]+)', content)
                if desc_section:
                    description = desc_section.group(1).strip()
                
                endpoints.add(ApiEndpoint(path=url, method=method, description=description))
    
    return endpoints


def check_outdated_docs(docs_dir: str, days_threshold: int = 90) -> List[ValidationResult]:
    """Check for outdated documentation files"""
    results = []
    markdown_files = glob.glob(f"{docs_dir}/**/*.md", recursive=True)
    
    cutoff_date = datetime.now() - timedelta(days=days_threshold)
    
    for file in markdown_files:
        # Skip templates
        if "templates" in file:
            continue
            
        mod_time = datetime.fromtimestamp(os.path.getmtime(file))
        
        # Look for "Last Updated" entry in the file
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            last_updated_match = re.search(r'Last Updated[:\s]+(\d{4}-\d{2}-\d{2})', content)
            
            if last_updated_match:
                try:
                    update_date = datetime.strptime(last_updated_match.group(1), '%Y-%m-%d')
                    if update_date < cutoff_date:
                        results.append(ValidationResult(
                            status="warning",
                            message=f"Document potentially outdated (last updated {update_date.strftime('%Y-%m-%d')})",
                            file=file
                        ))
                except ValueError:
                    results.append(ValidationResult(
                        status="warning",
                        message="Invalid date format in 'Last Updated' field",
                        file=file
                    ))
            else:
                # If no "Last Updated" field, use file modification time
                if mod_time < cutoff_date:
                    results.append(ValidationResult(
                        status="warning",
                        message=f"Document potentially outdated (last modified {mod_time.strftime('%Y-%m-%d')})",
                        file=file
                    ))
    
    return results


def check_implementation_status(docs_dir: str) -> List[ValidationResult]:
    """Check implementation status markers in documentation"""
    results = []
    markdown_files = glob.glob(f"{docs_dir}/**/*.md", recursive=True)
    
    for file in markdown_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Look for incomplete implementation markers
            status_items = re.findall(r'- \[ \] (.+)', content)
            if status_items:
                results.append(ValidationResult(
                    status="info",
                    message=f"Document contains {len(status_items)} incomplete implementation items",
                    file=file,
                    details=", ".join(status_items[:3]) + ("..." if len(status_items) > 3 else "")
                ))
    
    return results


def validate_documentation():
    print("Validating Dexter documentation...")
    
    # Define paths
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(project_dir, "backend")
    docs_dir = os.path.join(project_dir, "docs")
    
    results = []
    
    # Extract endpoints from code and docs
    try:
        code_endpoints = extract_endpoints_from_code(backend_dir)
        doc_endpoints = extract_endpoints_from_docs(docs_dir)
        
        # Find endpoints in code but not in docs
        missing_in_docs = code_endpoints - doc_endpoints
        for endpoint in missing_in_docs:
            results.append(ValidationResult(
                status="error",
                message=f"API endpoint not documented: {endpoint.method.upper()} {endpoint.path}",
                details=endpoint.description if endpoint.description else None
            ))
        
        # Find endpoints in docs but not in code
        missing_in_code = doc_endpoints - code_endpoints
        for endpoint in missing_in_code:
            results.append(ValidationResult(
                status="warning",
                message=f"Documented API endpoint not found in code: {endpoint.method.upper()} {endpoint.path}",
            ))
    except Exception as e:
        results.append(ValidationResult(
            status="error",
            message=f"Error validating API endpoints: {str(e)}",
        ))
    
    # Check for outdated documentation
    results.extend(check_outdated_docs(docs_dir))
    
    # Check implementation status
    results.extend(check_implementation_status(docs_dir))
    
    # Display results
    console.print("\n[bold]Documentation Validation Report[/bold]")
    
    # Count results by status
    error_count = sum(1 for r in results if r.status == "error")
    warning_count = sum(1 for r in results if r.status == "warning")
    info_count = sum(1 for r in results if r.status == "info")
    
    console.print(f"Found [bold red]{error_count}[/bold red] errors, [bold yellow]{warning_count}[/bold yellow] warnings, and [bold blue]{info_count}[/bold blue] info items.")
    
    # Display errors first
    if error_count > 0:
        console.print("\n[bold red]Errors:[/bold red]")
        for result in [r for r in results if r.status == "error"]:
            console.print(f"  ❌ {result.message}")
            if result.file:
                console.print(f"     File: {result.file}")
            if result.details:
                console.print(f"     Details: {result.details}")
    
    # Display warnings
    if warning_count > 0:
        console.print("\n[bold yellow]Warnings:[/bold yellow]")
        for result in [r for r in results if r.status == "warning"]:
            console.print(f"  ⚠️ {result.message}")
            if result.file:
                console.print(f"     File: {result.file}")
            if result.details:
                console.print(f"     Details: {result.details}")
    
    # Display info
    if info_count > 0:
        console.print("\n[bold blue]Info:[/bold blue]")
        for result in [r for r in results if r.status == "info"]:
            console.print(f"  ℹ️ {result.message}")
            if result.file:
                console.print(f"     File: {result.file}")
            if result.details:
                console.print(f"     Details: {result.details}")
    
    # Export results to JSON for CI/CD integration
    results_data = [
        {
            "status": r.status,
            "message": r.message,
            "file": r.file,
            "details": r.details
        }
        for r in results
    ]
    
    os.makedirs(os.path.join(docs_dir, "status"), exist_ok=True)
    with open(os.path.join(docs_dir, "status", "validation-results.json"), "w", encoding="utf-8") as f:
        json.dump(results_data, f, indent=2)
    
    return error_count == 0  # Success if no errors


if __name__ == "__main__":
    success = validate_documentation()
    sys.exit(0 if success else 1)
