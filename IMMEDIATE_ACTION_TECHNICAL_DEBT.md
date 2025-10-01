# Immediate Action: Technical Debt Cleanup

## 🚨 STOP: Do Not Proceed to EPIC B Until These Are Resolved

### Priority 0: Duplicate JS/TS Files (Day 1)

#### Files to Delete Immediately:
```bash
# These have TypeScript equivalents - DELETE THE JS VERSION
rm frontend/src/hooks/useAuditLog.js
rm frontend/src/utils/errorHandling.js  
rm frontend/src/components/EventTable/index.js
```

#### Files to Convert to TypeScript:
1. `frontend/src/hooks/useClipboard.js`
2. `frontend/src/hooks/useDataMasking.js`
3. `frontend/src/utils/errorFactory.js`
4. `frontend/src/utils/apiTesterConsole.js`
5. `frontend/src/utils/deadlockMockData.js`
6. `frontend/src/utils/memoryLeakMockData.js`
7. `frontend/src/utils/n1QueryMockData.js`
8. `frontend/tests/mocks/handlers.js`
9. `frontend/tests/mocks/server.js`
10. `frontend/tests/setup.js`

### Priority 1: API Client Consolidation (Day 2)

#### Current Chaos:
- 4 different API clients
- Direct axios usage
- Inconsistent auth handling

#### Target State:
- Single `/frontend/src/api/unified/apiClient.ts`
- All components use unified client
- Consistent error handling

### Priority 2: Complete Store Migration (Day 3)

#### Find & Replace:
```typescript
// OLD: import { useAppStore } from '../store/appStore';
// NEW: import { useAuthStore, useUIStore } from '../store';
```

#### Delete:
- `frontend/src/store/appStore.ts` (after migration complete)

### Priority 3: Backend Config Cleanup (Day 4)

#### Consolidate to Single Module:
- Keep: `/backend/app/core/settings.py`
- Delete redundant config files
- Fix circular imports

## Validation Checklist

After each day, run:
```bash
# Frontend
cd frontend
npm run build
npm run type-check
npm test

# Backend  
cd backend
python -m pytest
python -m mypy app
```

## Why This Matters

1. **Duplicate Files = Bugs**: Developers will import wrong version
2. **Multiple API Clients = Inconsistent Behavior**: Different error handling per component
3. **Incomplete Migration = Confusion**: Mixed patterns throughout codebase
4. **Config Chaos = Circular Dependencies**: Prevents clean architecture

## Next Steps After Cleanup

Only after ALL items above are complete:
1. Update CLAUDE.md with completion status
2. Run full integration tests
3. Create PR for technical debt cleanup
4. THEN proceed to EPIC B

## Time Investment
- **Total**: 4-5 days
- **ROI**: Prevents 2-3 weeks of debugging during EPIC B

## Bottom Line
**The duplicate JS/TS files alone will cause significant confusion during analyzer implementation. This cleanup is NOT optional.**