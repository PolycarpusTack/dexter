# File: backend/app/utils/formatters.py

"""
Utility functions for formatting data, e.g., into CSV.
"""
import csv
import io
from typing import List, Dict, Any, Generator # Keep Generator if needed elsewhere
import logging

logger = logging.getLogger(__name__)

CSV_HEADERS = [
    "id", "shortId", "title", "culprit", "level", "status",
    "count", "userCount", "firstSeen", "lastSeen",
    "project.slug", "project.name", "platform", # Added platform
]

def format_single_issue_to_csv_row(issue_dict: Dict[str, Any], writer: csv.DictWriter, string_io: io.StringIO) -> str:
    """Formats a single issue dictionary into a CSV row string."""
    try:
        flat_issue = issue_dict.copy()
        project_info = flat_issue.pop('project', {})
        flat_issue['project.slug'] = project_info.get('slug')
        flat_issue['project.name'] = project_info.get('name')
        # Ensure complex fields are handled simply or removed for CSV
        flat_issue.pop('metadata', None)
        flat_issue.pop('assignee', None)

        string_io.seek(0)
        string_io.truncate(0)
        writer.writerow(flat_issue)
        return string_io.getvalue()
    except Exception as e:
        logger.error(f"Failed to format issue row {issue_dict.get('id', 'N/A')} for CSV: {e}")
        # Return error marker row
        err_dict = {h: f"Error formatting row {issue_dict.get('id', 'N/A')}" if h == 'id' else '' for h in CSV_HEADERS}
        string_io.seek(0)
        string_io.truncate(0)
        writer.writerow(err_dict)
        return string_io.getvalue()