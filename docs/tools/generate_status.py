#!/usr/bin/env python3
"""
Documentation Status Dashboard Generator for Dexter Project.

This script generates a comprehensive status dashboard for documentation,
including component completion percentages, feature statuses, and TODOs.
"""

import os
import re
import glob
import json
import datetime
from typing import Dict, List, Any
from rich.console import Console

console = Console()

def scan_todos():
    """Scan code for TODO markers"""
    console.print("[bold]Scanning for TODOs in codebase...[/bold]")
    
    todos = []
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    code_files = (
        glob.glob(f"{project_dir}/backend/**/*.py", recursive=True) +
        glob.glob(f"{project_dir}/frontend/src/**/*.tsx", recursive=True) +
        glob.glob(f"{project_dir}/frontend/src/**/*.ts", recursive=True)
    )
    
    for file in code_files:
        rel_path = os.path.relpath(file, project_dir)
        with open(file, 'r', encoding='utf-8', errors='ignore') as f:
            try:
                for i, line in enumerate(f):
                    if "TODO" in line:
                        todos.append({
                            "file": rel_path,
                            "line": i + 1,
                            "text": line.strip(),
                        })
            except UnicodeDecodeError:
                # Skip binary files or files with encoding issues
                pass
    
    console.print(f"Found [bold]{len(todos)}[/bold] TODOs in codebase.")
    return todos


def scan_completion_status():
    """Scan documentation for completion status markers"""
    console.print("[bold]Scanning for completion status markers...[/bold]")
    
    status = {
        "components": [],
        "features": [],
        "last_updated": datetime.datetime.now().isoformat()
    }
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Pattern matching for status indicators in Markdown files
    status_pattern = re.compile(r'- \[([ x])\] (.+)')
    component_pattern = re.compile(r'##\s+(.+)\s+\((\d+)%\)')
    
    docs_files = glob.glob(f"{project_dir}/docs/**/*.md", recursive=True)
    md_files = glob.glob(f"{project_dir}/*.md")
    
    all_files = docs_files + md_files
    
    for file in all_files:
        rel_path = os.path.relpath(file, project_dir)
        # Skip template files
        if "/templates/" in file.replace("\\", "/"):
            continue
            
        with open(file, 'r', encoding='utf-8', errors='ignore') as f:
            try:
                content = f.read()
                
                # Extract component completion percentages
                for match in component_pattern.finditer(content):
                    component_name, percentage = match.groups()
                    status["components"].append({
                        "name": component_name.strip(),
                        "completion": int(percentage),
                        "source_file": rel_path
                    })
                
                # Extract feature statuses
                for match in status_pattern.finditer(content):
                    checked, feature_name = match.groups()
                    status["features"].append({
                        "name": feature_name.strip(),
                        "completed": checked == "x",
                        "source_file": rel_path
                    })
            except UnicodeDecodeError:
                # Skip binary files or files with encoding issues
                pass
    
    console.print(f"Found [bold]{len(status['components'])}[/bold] components and [bold]{len(status['features'])}[/bold] feature statuses.")
    return status


def scan_markdown_files():
    """Scan all markdown files and their timestamps"""
    console.print("[bold]Scanning markdown files...[/bold]")
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    markdown_stats = {
        "total_files": 0,
        "total_size_kb": 0,
        "oldest_file": None,
        "newest_file": None,
        "last_updated": [],
        "categories": {}
    }
    
    docs_files = glob.glob(f"{project_dir}/docs/**/*.md", recursive=True)
    md_files = glob.glob(f"{project_dir}/*.md")
    
    all_files = docs_files + md_files
    
    # Extract categories based on first-level directory
    for file in all_files:
        rel_path = os.path.relpath(file, project_dir)
        file_size = os.path.getsize(file) / 1024  # KB
        mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(file))
        
        markdown_stats["total_files"] += 1
        markdown_stats["total_size_kb"] += file_size
        
        # Track newest and oldest files
        if markdown_stats["newest_file"] is None or mod_time > datetime.datetime.fromtimestamp(os.path.getmtime(markdown_stats["newest_file"]["path"])):
            markdown_stats["newest_file"] = {"path": file, "rel_path": rel_path, "date": mod_time.strftime("%Y-%m-%d")}
        
        if markdown_stats["oldest_file"] is None or mod_time < datetime.datetime.fromtimestamp(os.path.getmtime(markdown_stats["oldest_file"]["path"])):
            markdown_stats["oldest_file"] = {"path": file, "rel_path": rel_path, "date": mod_time.strftime("%Y-%m-%d")}
        
        # Check for Last Updated field
        with open(file, 'r', encoding='utf-8', errors='ignore') as f:
            try:
                content = f.read()
                last_updated_match = re.search(r'Last Updated[:\s]+(\d{4}-\d{2}-\d{2})', content)
                if last_updated_match:
                    try:
                        update_date = datetime.datetime.strptime(last_updated_match.group(1), '%Y-%m-%d')
                        markdown_stats["last_updated"].append({
                            "path": rel_path,
                            "date": update_date.strftime("%Y-%m-%d")
                        })
                    except ValueError:
                        pass
            except UnicodeDecodeError:
                pass
        
        # Categorize by directory
        parts = rel_path.split(os.path.sep)
        if len(parts) > 1 and parts[0] == "docs":
            category = parts[1] if len(parts) > 2 else "root"
        else:
            category = "project_root"
        
        if category not in markdown_stats["categories"]:
            markdown_stats["categories"][category] = {"count": 0, "size_kb": 0}
        
        markdown_stats["categories"][category]["count"] += 1
        markdown_stats["categories"][category]["size_kb"] += file_size
    
    console.print(f"Found [bold]{markdown_stats['total_files']}[/bold] markdown files totaling [bold]{markdown_stats['total_size_kb']:.1f}[/bold] KB.")
    return markdown_stats


def generate_status_dashboard():
    """Generate status dashboard"""
    console.print("[bold]Generating documentation status dashboard...[/bold]")
    
    # Collect data
    todos = scan_todos()
    status = scan_completion_status()
    markdown_stats = scan_markdown_files()
    
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_dir, "docs", "status")
    os.makedirs(output_dir, exist_ok=True)
    
    # Save as JSON for potential dynamic rendering
    with open(os.path.join(output_dir, "status-data.json"), "w", encoding="utf-8") as f:
        json.dump({
            "todos": todos,
            "status": status,
            "markdown_stats": markdown_stats,
            "generated_at": datetime.datetime.now().isoformat()
        }, f, indent=2)
    
    # Generate Markdown report
    with open(os.path.join(output_dir, "documentation-status.md"), "w", encoding="utf-8") as f:
        f.write("# Dexter Documentation Status\n\n")
        f.write(f"*Last updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}*\n\n")
        
        # Documentation Stats
        f.write("## Documentation Overview\n\n")
        f.write(f"- **Total Documentation Files:** {markdown_stats['total_files']}\n")
        f.write(f"- **Total Documentation Size:** {markdown_stats['total_size_kb']:.1f} KB\n")
        f.write(f"- **Newest File:** {markdown_stats['newest_file']['rel_path']} ({markdown_stats['newest_file']['date']})\n")
        f.write(f"- **Oldest File:** {markdown_stats['oldest_file']['rel_path']} ({markdown_stats['oldest_file']['date']})\n\n")
        
        # Documentation Categories
        f.write("### Documentation Categories\n\n")
        f.write("| Category | File Count | Size (KB) |\n")
        f.write("|----------|------------|----------|\n")
        for category, data in sorted(markdown_stats["categories"].items()):
            f.write(f"| {category} | {data['count']} | {data['size_kb']:.1f} |\n")
        f.write("\n")
        
        # Component completion
        f.write("## Component Completion\n\n")
        
        if not status["components"]:
            f.write("*No component completion data found. Consider adding component completion percentages in your documentation using the format `## Component Name (XX%)`.*\n\n")
        else:
            # Sort by completion percentage (descending)
            for component in sorted(status["components"], key=lambda x: x["completion"], reverse=True):
                f.write(f"### {component['name']} ({component['completion']}%)\n\n")
                progress_bar = "█" * (component["completion"] // 5) + "░" * ((100 - component["completion"]) // 5)
                f.write(f"`{progress_bar}` {component['completion']}%\n\n")
                f.write(f"*Source: {component['source_file']}*\n\n")
        
        # Feature status
        f.write("## Feature Status\n\n")
        completed = [f for f in status["features"] if f["completed"]]
        pending = [f for f in status["features"] if not f["completed"]]
        
        f.write(f"- ✅ **{len(completed)}** features completed\n")
        f.write(f"- ⏳ **{len(pending)}** features pending\n\n")
        
        f.write("### Completed Features\n\n")
        for feature in sorted(completed, key=lambda x: x["name"]):
            f.write(f"- ✅ {feature['name']} *({feature['source_file']})*\n")
        
        if not completed:
            f.write("*No completed features found.*\n")
        
        f.write("\n### Pending Features\n\n")
        for feature in sorted(pending, key=lambda x: x["name"]):
            f.write(f"- ⏳ {feature['name']} *({feature['source_file']})*\n")
        
        if not pending:
            f.write("*No pending features found.*\n")
        
        # TODOs
        f.write("\n## Development TODOs\n\n")
        f.write(f"**{len(todos)}** TODOs found in codebase\n\n")
        
        if todos:
            # Group TODOs by file
            todos_by_file = {}
            for todo in todos:
                if todo['file'] not in todos_by_file:
                    todos_by_file[todo['file']] = []
                todos_by_file[todo['file']].append(todo)
            
            for file, file_todos in sorted(todos_by_file.items()):
                f.write(f"### {file}\n\n")
                for todo in sorted(file_todos, key=lambda x: x["line"]):
                    f.write(f"- Line {todo['line']}: `{todo['text']}`\n")
                f.write("\n")
        else:
            f.write("*No TODOs found in codebase.*\n\n")
        
        # Documentation Health Recommendations
        f.write("## Documentation Health Recommendations\n\n")
        
        # Calculate health score based on various factors
        health_score = 100
        
        # Penalize for missing component completion info
        if len(status["components"]) < 5:
            health_score -= 10
            f.write("⚠️ **Recommendation:** Add more component completion percentages in your documentation using the format `## Component Name (XX%)`.\n\n")
        
        # Penalize for outdated documents
        if len(markdown_stats["last_updated"]) < markdown_stats["total_files"] * 0.5:
            health_score -= 20
            f.write("⚠️ **Recommendation:** Add 'Last Updated: YYYY-MM-DD' entries to your documentation files.\n\n")
        
        # Penalize for pending features
        if len(pending) > len(completed):
            health_score -= 15
            f.write("⚠️ **Recommendation:** Focus on completing features marked as pending in your documentation.\n\n")
        
        # Penalize for TODOs
        if len(todos) > 20:
            health_score -= 15
            f.write("⚠️ **Recommendation:** Address TODO comments in your code or convert them to documented issues.\n\n")
        
        f.write(f"**Documentation Health Score:** {max(0, health_score)}%\n\n")
        
        # Health bar
        health_bar = "█" * (max(0, health_score) // 5) + "░" * ((100 - max(0, health_score)) // 5)
        f.write(f"`{health_bar}`\n\n")
        
        # Final recommendations based on health score
        if health_score < 50:
            f.write("🔴 **Overall Assessment:** Documentation requires significant improvement.\n\n")
        elif health_score < 80:
            f.write("🟠 **Overall Assessment:** Documentation needs attention in specific areas.\n\n")
        else:
            f.write("🟢 **Overall Assessment:** Documentation is in good health.\n\n")

    console.print(f"✅ Status dashboard generated at [bold]docs/status/documentation-status.md[/bold]")


if __name__ == "__main__":
    generate_status_dashboard()
