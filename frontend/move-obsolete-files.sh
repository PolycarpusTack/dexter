#!/bin/bash

echo "Creating to_be_deleted subdirectories..."
mkdir -p to_be_deleted/api
mkdir -p to_be_deleted/components
mkdir -p to_be_deleted/hooks
mkdir -p to_be_deleted/utils
mkdir -p to_be_deleted/tests
mkdir -p to_be_deleted/temp
mkdir -p to_be_deleted/scripts
mkdir -p to_be_deleted/typings

echo "Moving JSX duplicate files..."
# JSX duplicates
cp src/components/DeadlockDisplay/DeadlockModal.jsx to_be_deleted/components/
cp src/components/DeadlockDisplay/EnhancedDeadlockDisplay.jsx to_be_deleted/components/

echo "Moving JS duplicate files..."
# JS duplicates 
cp src/components/EventTable/columns/index.js to_be_deleted/components/EventTable_columns_index.js
cp src/components/EventTable/index.js to_be_deleted/components/EventTable_index.js
cp src/hooks/useAuditLog.js to_be_deleted/hooks/
cp src/hooks/useClipboard.js to_be_deleted/hooks/
cp src/hooks/useDataMasking.js to_be_deleted/hooks/
cp src/utils/errorFactory.js to_be_deleted/utils/
cp src/utils/errorHandling.js to_be_deleted/utils/
cp src/utils/retryManager.js to_be_deleted/utils/
cp src/utils/errorSimulation.js to_be_deleted/utils/
cp src/utils/apiTesterConsole.js to_be_deleted/utils/
cp src/utils/deadlockMockData.js to_be_deleted/utils/
cp src/utils/sentryDataExtractors.js to_be_deleted/utils/

echo "Moving backup files..."
# Backup files
cp src/components/Settings/SettingsInput-backup.tsx to_be_deleted/components/

echo "Moving duplicated utility files..."
# Utils duplication with errorHandling directory
cp src/utils/errorFactory.ts to_be_deleted/utils/
cp src/utils/errorHandling.ts to_be_deleted/utils/
cp src/utils/errorTracking.ts to_be_deleted/utils/

echo "Moving duplicate test files..."
# Test duplications
cp src/components/__tests__/EventTable.test.tsx to_be_deleted/tests/
cp src/components/__tests__/example.test.tsx to_be_deleted/tests/

echo "Moving temporary files..."
# Temporary files
cp src/api/unified/temp-import-check.ts to_be_deleted/temp/
cp test-import.js to_be_deleted/temp/
cp check-template-api.js to_be_deleted/temp/
cp check-template-api.mjs to_be_deleted/temp/

echo "Moving migration scripts..."
# Migration scripts
cp cleanup-api.sh to_be_deleted/scripts/
cp cleanup-model-selectors.sh to_be_deleted/scripts/
cp fix-esm-compat.js to_be_deleted/scripts/
cp fix-babel-typescript.bat to_be_deleted/scripts/
cp fix-build-issues.bat to_be_deleted/scripts/
cp fix-build.bat to_be_deleted/scripts/
cp fix-dependencies.bat to_be_deleted/scripts/
cp fix-icons.bat to_be_deleted/scripts/
cp fix-mantine-component.bat to_be_deleted/scripts/
cp fix-mantine-deps.bat to_be_deleted/scripts/
cp module-resolution.js to_be_deleted/scripts/
cp vite-plugin-import-extension.js to_be_deleted/scripts/
cp vite-plugin-import-types.js to_be_deleted/scripts/
cp update-imports.js to_be_deleted/scripts/

# Also copy the markdown files explaining the issues fixed
cp README-BUILD-ISSUES.md to_be_deleted/
cp IMPORT_FIXES_SUMMARY.md to_be_deleted/
cp MANTINE_FIX_INSTRUCTIONS.md to_be_deleted/
cp MANTINE_MIGRATION_SUMMARY.md to_be_deleted/

echo ""
echo "Files have been copied to the to_be_deleted directory."
echo "IMPORTANT: This script only copies files. It does not delete them."
echo "Please verify the application still builds and functions correctly"
echo "before deleting the original files."
echo ""
echo "To view the full cleanup report, see: to_be_deleted/CLEANUP_REPORT.md"