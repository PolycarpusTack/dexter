#!/bin/bash
# Cleanup script for Dexter project
# This script removes unnecessary files to clean up the repository

echo "Starting Dexter project cleanup..."

# 1. Remove backup and .bak files
echo "Removing backup and .bak files..."
rm -f /mnt/c/Projects/Dexter/backend/app/main.py.bak
rm -f /mnt/c/Projects/Dexter/backend/app/main_debug.py.bak
rm -f /mnt/c/Projects/Dexter/backend/app/main_enhanced.py.bak
rm -f /mnt/c/Projects/Dexter/backend/app/main_minimal.py.bak
rm -f /mnt/c/Projects/Dexter/backend/app/main_simplified.py.bak
rm -f /mnt/c/Projects/Dexter/frontend/src/components/ExportButton/ExportButton.jsx.bak
rm -f /mnt/c/Projects/Dexter/frontend/src/pages/DashboardPage.d.ts.bak

# 2. Remove Windows redirect artifacts and old build files
echo "Removing Windows redirect artifacts and build files..."
rm -f /mnt/c/Projects/Dexter/backend/nul
rm -f /mnt/c/Projects/Dexter/frontend/vite.config.ts.timestamp-1747226932576-7e039cf69dc27.mjs

# 3. Remove redundant archive files
echo "Removing redundant archive files..."
rm -f /mnt/c/Projects/Dexter/frontend/src/components/EventTable.zip

# 4. Remove backup directory (it contains old versions we don't need)
echo "Removing backup directory..."
rm -rf /mnt/c/Projects/Dexter/backup

# 5. Remove completed task reports that have been consolidated
echo "Removing consolidated task reports..."
rm -f /mnt/c/Projects/Dexter/TASK-2.1-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-2.2-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-2.3-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-2.4-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-2.5-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-2.5-REPORT.md
rm -f /mnt/c/Projects/Dexter/TASK-4.1-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-4.2-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-4.3-COMPLETION.md
rm -f /mnt/c/Projects/Dexter/TASK-4.4-COMPLETION.md
# Keep TASK-4.5-COMPLETION.md as it's the most recent completion report

# 6. Remove redundant implementation documents
echo "Removing redundant implementation documents..."
rm -f /mnt/c/Projects/Dexter/PHASE1-COMPLETION-REPORT.md
rm -f /mnt/c/Projects/Dexter/DISCOVER_IMPLEMENTATION.md
rm -f /mnt/c/Projects/Dexter/DEADLOCK-MODAL-IMPLEMENTATION-REPORT.md
rm -f /mnt/c/Projects/Dexter/COMMIT-MESSAGE-DEADLOCK-MODAL.md
rm -f /mnt/c/Projects/Dexter/DEVELOPMENT-DETAILS-DEADLOCK-MODAL.md

# 7. Clean up old/replaced documents
echo "Cleaning up old/replaced documents..."
rm -f /mnt/c/Projects/Dexter/API_CLIENT_CONSOLIDATION_STATUS.md
rm -f /mnt/c/Projects/Dexter/DEADLOCK-MODAL-SUMMARY.md
rm -f /mnt/c/Projects/Dexter/CONSOLIDATION.md
rm -f /mnt/c/Projects/Dexter/MIGRATION_SUMMARY.md
rm -f /mnt/c/Projects/Dexter/DISCOVER_SUMMARY.md
rm -f /mnt/c/Projects/Dexter/PHASE1-COMPLETION-STATUS.md
rm -f /mnt/c/Projects/Dexter/PHASE1-COMPLETION-SUCCESS.md
rm -f /mnt/c/Projects/Dexter/IMPLEMENTATION-GUIDE.md

# 8. Remove old testing and utility scripts that are no longer needed
echo "Removing old testing and utility scripts..."
rm -f /mnt/c/Projects/Dexter/check-property-mappings.js
rm -f /mnt/c/Projects/Dexter/find-store-consumers.js
rm -f /mnt/c/Projects/Dexter/update-property-names.js
rm -f /mnt/c/Projects/Dexter/verify-consolidation.js
rm -f /mnt/c/Projects/Dexter/verify-imports.js

# 9. Clean up old src directory (migrated to frontend/src)
echo "Cleaning up old src directory..."
rm -rf /mnt/c/Projects/Dexter/src

# 10. Remove Old_JS_Dexter directory if it's just for reference
echo "Consider removing Old_JS_Dexter directory if no longer needed..."
# rm -rf /mnt/c/Projects/Dexter/Old_JS_Dexter  # Commented out for safety, uncomment if sure

echo "Cleanup complete! The repository is now tidier."
echo "Consider running 'git status' to see what files were removed and then commit the changes."