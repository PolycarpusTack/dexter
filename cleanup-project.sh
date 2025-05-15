#!/bin/bash

# Project Cleanup Script
echo "Starting Dexter Project Cleanup..."

# 1. Create archive directories
echo "Creating archive directories..."
mkdir -p frontend/src/components/archive-to-delete
mkdir -p frontend/src/api/archive-to-delete
mkdir -p frontend/src/hooks/archive-to-delete
mkdir -p frontend/src/pages/archive-to-delete
mkdir -p frontend/src/types/archive-to-delete

# 2. Archive duplicate and unnecessary files
echo "Moving duplicate files to archive directories..."

# API files
echo "Archiving old API files..."
# Move all old API files except index.ts, compat.ts and unified directory
mv frontend/src/api/aiApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/alertsApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/analyticsApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/deadlockApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/discover.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/discoverApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/enhancedDeadlockApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/enhancedIssuesApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/errorAnalyticsApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/eventApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/eventsApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/issuesApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/modelApi.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true
mv frontend/src/api/optimizedApiExample.ts frontend/src/api/archive-to-delete/ 2>/dev/null || true

# Move archived directory content to archive-to-delete if it exists
if [ -d "frontend/src/api/archived" ]; then
  mv frontend/src/api/archived/* frontend/src/api/archive-to-delete/ 2>/dev/null || true
  rmdir frontend/src/api/archived 2>/dev/null || true
fi

# Component files
echo "Archiving duplicate component files..."
# DeadlockDisplay components - keep newer versions
mv frontend/src/components/DeadlockDisplay/DeadlockDisplay.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/DeadlockDisplay/EnhancedGraphView.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true 
mv frontend/src/components/DeadlockDisplay/RecommendationPanel.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/DeadlockDisplay/TableInfo.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true

# EventTable components - keep newer versions
mv frontend/src/components/EventTable/EnhancedEventTable.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/EventTable/EventRow.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/EventTable/EventTable.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/EventTable/columns/DeadlockColumn.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/EventTable/columns/ImpactCell.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/EventTable/columns/SparklineCell.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true

# Other components - keep newer versions
mv frontend/src/components/ExplainError/ExplainError.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/EventDetail/EventDetail.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true
mv frontend/src/components/ModelSelector/ModelSelector.jsx frontend/src/components/archive-to-delete/ 2>/dev/null || true

# Hook files
echo "Archiving duplicate hook files..."
mv frontend/src/hooks/useEventFrequency.js frontend/src/hooks/archive-to-delete/ 2>/dev/null || true
mv frontend/src/hooks/useIssueImpact.js frontend/src/hooks/archive-to-delete/ 2>/dev/null || true

# Page files
echo "Archiving duplicate page files..."
mv frontend/src/pages/DashboardPage.jsx frontend/src/pages/archive-to-delete/ 2>/dev/null || true
mv frontend/src/pages/EventsPage.jsx frontend/src/pages/archive-to-delete/ 2>/dev/null || true

# 3. Fix TypeScript errors
echo "Fixing TypeScript errors..."

# Fix aria.ts error by adding visuallyHidden to default export
if [ -f "frontend/src/utils/aria.ts" ]; then
  sed -i 's/visuallyHidden/visuallyHiddenStyle/' frontend/src/utils/aria.ts
fi

# Fix CreateaDeployRequest error in sentry-generated.ts
if [ -f "frontend/src/types/api/sentry-generated.ts" ]; then
  sed -i 's/{version: string;/version: string;/' frontend/src/types/api/sentry-generated.ts
fi

# 4. Create unified API structure if missing
echo "Ensuring unified API structure exists..."
mkdir -p frontend/src/api/unified/hooks
mkdir -p frontend/src/api/unified/tests

echo "Project cleanup completed!"
echo "Files were moved to archive directories but not deleted."
echo "Please verify the project builds correctly and then delete the archive directories if desired."