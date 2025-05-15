#!/bin/bash
# Script to create a commit with the cleanup changes

cd /mnt/c/Projects/Dexter

# Add the changes to the staging area
git add -A

# Create the commit with a descriptive message
git commit -m "Project cleanup: Remove unnecessary files and organize documentation

- Removed backup (.bak) files and directories
- Removed duplicate and redundant implementation reports
- Cleaned up old task completion documents that have been consolidated
- Organized key documentation in docs/final directory
- Removed unused script files and test artifacts
- Created IMPORTANT_FILES.md as reference for important documentation

This commit completes the cleanup process for the project, leaving only the essential
files necessary for development, deployment, and maintenance."

echo "Commit created successfully!"
echo "Run 'git status' to verify the changes have been committed."
echo "Run 'git push' to push the changes to the remote repository."