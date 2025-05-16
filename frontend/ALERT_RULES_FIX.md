# Alert Rules Component Fix

## Issue
The build was failing because the AlertRules and AlertRuleBuilder components were importing from the old `alertsApi` which doesn't exist in the unified API structure.

## Solution

### 1. Updated Imports
Changed from:
```typescript
import { alertsApi, AlertRuleResponse } from '../../api/alertsApi';
```

To:
```typescript
import { api } from '../../api/unified';
import { AlertRule } from '../../api/unified/alertsApi';
```

### 2. Fixed Type Names
- Changed `AlertRuleResponse` to `AlertRule` throughout both components
- Added local interface definitions for form-specific types that aren't exported by the unified API:
  - `AlertRuleCondition`
  - `AlertRuleFilter`
  - `MetricAlertTrigger`
  - `IssueAlertRule`
  - `MetricAlertRule`

### 3. Updated API Calls
All API calls were updated to use the unified API structure:

From:
```typescript
const response = await alertsApi.listAlertRules(projectSlug);
```

To:
```typescript
const response = await api.alerts.listAlertRules({
  projectSlug: project,
  organizationSlug: org || '',
  projectId: project,
  organizationId: org || ''
});
```

### 4. Files Updated
1. `/frontend/src/components/AlertRules/AlertRules.tsx`
   - Updated imports
   - Changed type from `AlertRuleResponse` to `AlertRule`
   - Updated all API calls

2. `/frontend/src/components/AlertRules/AlertRuleBuilder.tsx`
   - Updated imports
   - Added local type definitions
   - Updated all API calls
   - Fixed references to `editingRule.type` to use `ruleType` prop

## Build Command
The build should now succeed:
```bash
npm run build
```

## Next Steps
1. Test the AlertRules functionality to ensure it works correctly with the unified API
2. Consider moving the local type definitions to a shared types file if they're needed elsewhere
3. Update any other components that might be using the old alerts API