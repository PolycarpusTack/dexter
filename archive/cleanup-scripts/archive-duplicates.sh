#!/bin/bash

# Create archive directories
mkdir -p frontend/src/components/archive-to-delete
mkdir -p frontend/src/api/archive-to-delete
mkdir -p frontend/src/hooks/archive-to-delete
mkdir -p frontend/src/pages/archive-to-delete

# Archive old API files that have been migrated to unified directory
# API files - move all except index.ts, compat.ts and unified directory
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

# Archive duplicate JSX files that have newer TSX counterparts
# DeadlockDisplay components
mv frontend/src/components/DeadlockDisplay/DeadlockDisplay.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/DeadlockDisplay/EnhancedGraphView.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/DeadlockDisplay/RecommendationPanel.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/DeadlockDisplay/TableInfo.jsx frontend/src/components/archive-to-delete/

# EventTable components
mv frontend/src/components/EventTable/EnhancedEventTable.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/EventTable/EventRow.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/EventTable/EventTable.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/EventTable/columns/DeadlockColumn.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/EventTable/columns/ImpactCell.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/EventTable/columns/SparklineCell.jsx frontend/src/components/archive-to-delete/

# ExplainError and other components
mv frontend/src/components/ExplainError/ExplainError.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/EventDetail/EventDetail.jsx frontend/src/components/archive-to-delete/
mv frontend/src/components/ModelSelector/ModelSelector.jsx frontend/src/components/archive-to-delete/

# Hooks files
mv frontend/src/hooks/useEventFrequency.js frontend/src/hooks/archive-to-delete/
mv frontend/src/hooks/useIssueImpact.js frontend/src/hooks/archive-to-delete/

# Page components
mv frontend/src/pages/DashboardPage.jsx frontend/src/components/archive-to-delete/
mv frontend/src/pages/EventsPage.jsx frontend/src/components/archive-to-delete/

echo "Moved duplicate files to archive directories"
echo "Files can be safely deleted after verifying the project compiles correctly"