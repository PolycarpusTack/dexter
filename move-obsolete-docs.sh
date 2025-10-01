#!/bin/bash

echo "Creating docs_to_be_deleted subdirectories..."
mkdir -p docs_to_be_deleted/status-reports
mkdir -p docs_to_be_deleted/fixes
mkdir -p docs_to_be_deleted/api-docs
mkdir -p docs_to_be_deleted/component-docs
mkdir -p docs_to_be_deleted/error-handling
mkdir -p docs_to_be_deleted/migration
mkdir -p docs_to_be_deleted/duplicates
mkdir -p docs_to_be_deleted/consolidated

echo "Copying duplicate files (root vs final)..."
# Duplicate files (root vs final)
cp DEVELOPMENT_GUIDE.md docs_to_be_deleted/duplicates/
cp EXTERNAL_API_INTEGRATION.md docs_to_be_deleted/duplicates/
cp PROJECT-COMPLETION.md docs_to_be_deleted/duplicates/
cp PROJECT-STATUS-UPDATE.md docs_to_be_deleted/duplicates/
cp TASK-4.5-COMPLETION.md docs_to_be_deleted/duplicates/
cp TROUBLESHOOTING.md docs_to_be_deleted/duplicates/

echo "Copying status reports..."
# Status reports
cp API_CLIENT_CONSOLIDATION_STATUS.md docs_to_be_deleted/status-reports/
cp PHASE4-PROGRESS-REPORT.md docs_to_be_deleted/status-reports/
cp PROJECT-STATUS-UPDATE-MAY-18.md docs_to_be_deleted/status-reports/
cp PROJECT-STATUS-UPDATE.md docs_to_be_deleted/status-reports/
cp TASK-2.3-COMPLETION.md docs_to_be_deleted/status-reports/
cp TASK-4.5-COMPLETION.md docs_to_be_deleted/status-reports/
cp PROJECT-CLEANUP-SUMMARY.md docs_to_be_deleted/status-reports/
cp CLEANUP_SUMMARY.md docs_to_be_deleted/status-reports/

echo "Copying fix-related documentation..."
# Fix-related documentation
cp BACKEND_FIXES.md docs_to_be_deleted/fixes/
cp DASHBOARD_FIX_REPORT.md docs_to_be_deleted/fixes/
cp FIXED.md docs_to_be_deleted/fixes/
cp FIXES-SUMMARY.md docs_to_be_deleted/fixes/
cp FIXES_SUMMARY.md docs_to_be_deleted/fixes/
cp HOW_TO_FIX_FRONTEND.md docs_to_be_deleted/fixes/
cp ICON_FIX_INSTRUCTIONS.md docs_to_be_deleted/fixes/
cp frontend/ALERT_RULES_FIX.md docs_to_be_deleted/fixes/
cp frontend/IMPORT_FIXES_SUMMARY.md docs_to_be_deleted/fixes/
cp frontend/MANTINE_FIX_INSTRUCTIONS.md docs_to_be_deleted/fixes/
cp frontend/MANTINE_MIGRATION_SUMMARY.md docs_to_be_deleted/fixes/
cp frontend/README-BUILD-ISSUES.md docs_to_be_deleted/fixes/

echo "Copying overlapping API documentation..."
# Overlapping API documentation
cp docs/api-implementation-action-plan.md docs_to_be_deleted/api-docs/
cp docs/api-status-evaluation.md docs_to_be_deleted/api-docs/
cp docs/API_MIGRATION_PROGRESS.md docs_to_be_deleted/api-docs/
cp docs/API_CLEANUP_PLAN.md docs_to_be_deleted/api-docs/
cp docs/API-Optimization-Implementation-Prompts.md docs_to_be_deleted/api-docs/
cp docs/API-Optimization-Solution-Design.md docs_to_be_deleted/api-docs/
cp docs/api_implementation_summary.md docs_to_be_deleted/api-docs/
cp frontend/API_MIGRATION_GUIDE.md docs_to_be_deleted/api-docs/

echo "Copying error handling documentation duplicates..."
# Error handling documentation duplicates
cp frontend/src/utils/ERROR_CATEGORIES.md docs_to_be_deleted/error-handling/
cp frontend/src/utils/ERROR_HANDLING_EXAMPLES.md docs_to_be_deleted/error-handling/
cp frontend/src/utils/ERROR_HANDLING_GUIDE.md docs_to_be_deleted/error-handling/
cp frontend/ERROR_HANDLING_IMPLEMENTATION.md docs_to_be_deleted/error-handling/

echo "Copying Python migration documentation..."
# Python migration documentation (after consolidation)
cp backend/MIGRATION_ANNOUNCEMENT.md docs_to_be_deleted/migration/
cp backend/PYTHON313_STATUS_UPDATE.md docs_to_be_deleted/migration/
cp backend/README_MIGRATION.md docs_to_be_deleted/migration/

echo "Copying consolidated directory duplicates..."
# Copy all files from docs/consolidated that have duplicates elsewhere
cp -r docs/consolidated/* docs_to_be_deleted/consolidated/

echo "Documentation files copied to docs_to_be_deleted directory."
echo ""
echo "IMPORTANT: This script only copies files. It does not delete them."
echo "Please verify that the documentation remains functional and complete"
echo "before removing the original files."
echo ""
echo "To view the full documentation cleanup report, see: docs_to_be_deleted/DOCUMENTATION_CLEANUP_REPORT.md"