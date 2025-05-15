#!/bin/bash
# Phase 2 Cleanup script for Dexter project
# This script focuses on organizing and cleaning up documentation files

echo "Starting Phase 2 cleanup for Dexter project..."

# Create consolidated documentation directory if it doesn't exist
mkdir -p /mnt/c/Projects/Dexter/docs/final

# 1. Copy key documentation to the final docs directory
echo "Organizing documentation..."
cp /mnt/c/Projects/Dexter/README.md /mnt/c/Projects/Dexter/docs/final/
cp /mnt/c/Projects/Dexter/PROJECT-COMPLETION.md /mnt/c/Projects/Dexter/docs/final/
cp /mnt/c/Projects/Dexter/TASK-4.5-COMPLETION.md /mnt/c/Projects/Dexter/docs/final/
cp /mnt/c/Projects/Dexter/PROJECT-STATUS-UPDATE.md /mnt/c/Projects/Dexter/docs/final/
cp /mnt/c/Projects/Dexter/EXTERNAL_API_INTEGRATION.md /mnt/c/Projects/Dexter/docs/final/
cp /mnt/c/Projects/Dexter/TROUBLESHOOTING.md /mnt/c/Projects/Dexter/docs/final/
cp /mnt/c/Projects/Dexter/DEVELOPMENT_GUIDE.md /mnt/c/Projects/Dexter/docs/final/
cp /mnt/c/Projects/Dexter/docs/consolidated/AI_PERFORMANCE_METRICS.md /mnt/c/Projects/Dexter/docs/final/

# 2. Remove old documentation files from consolidated directory
echo "Cleaning up redundant documentation..."
rm -f /mnt/c/Projects/Dexter/PR-template-deadlock-analyzer.md
rm -f /mnt/c/Projects/Dexter/README-Deadlock-Analyzer.md
rm -f /mnt/c/Projects/Dexter/README-API-PATH-CONSOLIDATION.md
rm -f /mnt/c/Projects/Dexter/README-Deadlock-Modal.md
rm -f /mnt/c/Projects/Dexter/README-KEYBOARD-NAVIGATION.md
rm -f /mnt/c/Projects/Dexter/DEADLOCK-MODAL-IMPLEMENTATION-CONCLUSION.md
rm -f /mnt/c/Projects/Dexter/PYDANTIC-COMPATIBILITY-REPORT.md
rm -f /mnt/c/Projects/Dexter/dexter-project-analysis.md
rm -f /mnt/c/Projects/Dexter/INTEGRATION-COMPLETE.md

# 3. Clean up unused script files
echo "Removing unused script files..."
rm -f /mnt/c/Projects/Dexter/migration-scripts.sh
rm -f /mnt/c/Projects/Dexter/mvp-completion-plan.md
rm -f /mnt/c/Projects/Dexter/run-tests.ps1
rm -f /mnt/c/Projects/Dexter/run-tests.sh
rm -f /mnt/c/Projects/Dexter/run_api_tests.cmd

# 4. Add a note about keeping important files to the cleanup script
echo "# Important files to keep:
# - README.md
# - PROJECT-COMPLETION.md
# - TASK-4.5-COMPLETION.md
# - PROJECT-STATUS-UPDATE.md
# - EXTERNAL_API_INTEGRATION.md
# - TROUBLESHOOTING.md
# - DEVELOPMENT_GUIDE.md
# - docs/consolidated/AI_PERFORMANCE_METRICS.md
# - backend/README.md
# - frontend/README.md
# - docs/final/* (consolidated documentation)
# - CLAUDE.md (for Claude.ai/code)

# These files should NOT be removed during cleanup" > /mnt/c/Projects/Dexter/IMPORTANT_FILES.md

echo "Phase 2 cleanup complete!"
echo "The docs/final directory now contains the most important documentation files."
echo "Check IMPORTANT_FILES.md for a list of files that should be preserved."