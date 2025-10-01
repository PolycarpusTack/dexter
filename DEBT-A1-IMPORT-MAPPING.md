# DEBT-A1: Import Mapping for Duplicate JS/TS Files

**Created:** 2025-10-01
**Updated:** 2025-10-01 (Analysis Complete)
**Task:** DEBT-A1-T1a - Create Import Mapping
**Status:** ✅ COMPLETE

---

## Executive Summary

This document maps all JavaScript/JSX files to their import locations to enable safe deletion and migration to TypeScript.

### Files Identified

**Total JSX files:** 15
**TypeScript equivalents exist:** 0 (EventDetail.tsx is different, not a replacement)
**Active files (in use):** 1 (ExportControl.jsx)
**Unused files (safe to delete):** 12
**Verification needed:** 2 (SparklineChart, EnhancedEventDetail)
**Conversion needed:** 1 (ExportControl.jsx)

---

## Import Dependency Map

### Summary Statistics

| Import Type | Count | Percentage |
|-------------|-------|------------|
| No imports (unused) | 12 | 80% |
| Re-exported only (no consumers) | 1 | 6.7% |
| Direct imports (active) | 1 | 6.7% |
| Documentation only | 1 | 6.7% |
| **Total** | **15** | **100%** |

### Status Distribution

| Status | Count | Files |
|--------|-------|-------|
| 🔴 UNUSED (delete) | 12 | EventDetail components (11) + EnhancedEventDetail |
| 🟡 VERIFY USAGE | 1 | SparklineChart |
| ✅ ACTIVE (convert) | 1 | ExportControl |
| 🟢 NEEDS CONVERSION | 1 | ExportControl |

---

## Detailed File Analysis

### 1. EnhancedEventDetail.jsx 🟡

**Location:** `/mnt/c/Projects/dexter/frontend/src/components/EventDetail/EnhancedEventDetail.jsx`
**Lines of Code:** 269

**Import Analysis:**
- **Direct Imports:** 0
- **Index Re-exports:** 1 (from `index.ts` line 4)
- **Consumers:** NONE

**Component Features:**
- Deadlock detection and display
- AI-powered error explanations
- Accordion-based event details
- Request/release info sections
- Related events display
- Uses OLD API (not unified client)

**TypeScript Comparison:**
- EventDetail.tsx EXISTS but is DIFFERENT (simpler, uses unified API, no deadlock/AI features)
- NOT a replacement - different component entirely

**Status:** 🟡 OBSOLETE - Enhanced features not actively used
**Recommended Action:** DELETE (or convert if enhanced features needed)

---

### 2-13. EventDetail Component Files 🔴

**Location:** `/mnt/c/Projects/dexter/frontend/src/components/EventDetail/components/`

All 12 files are:
- ✅ Re-exported by `components/index.ts`
- ❌ NO consumers found (nothing imports from the index)
- ❌ NO direct imports
- ❌ NO TypeScript equivalents

**Files:**
1. `Actions.jsx` (43 lines) - Resolve/Ignore buttons + AIModelSettings
2. `BreadcrumbsSection.jsx` - Event breadcrumbs timeline
3. `ContextSection.jsx` - Context data display
4. `ErrorMessage.jsx` - Error message rendering
5. `EventStatistics.jsx` - Event statistics display
6. `Header.jsx` (160 lines) - Event detail header (NOT the app Header.tsx)
7. `RelatedEvents.jsx` - Related events list
8. `ReleaseInfo.jsx` - Release information
9. `RequestSection.jsx` - Request details
10. `Stacktrace.jsx` - Stack trace display
11. `TagsSection.jsx` - Tags display
12. `UserSection.jsx` - User information

**Status:** 🔴 UNUSED - All 12 files have zero imports
**Recommended Action:** DELETE ALL (Phase 1 - immediate deletion)

---

### 14. ExportControl.jsx ✅

**Location:** `/mnt/c/Projects/dexter/frontend/src/components/Export/ExportControl.jsx`
**Lines of Code:** 105

**Import Analysis:**
- **Direct Imports:** 1
  - Used by: `EnhancedEventTable.tsx` (line 45)
  - Import: `import ExportControl from '../Export/ExportControl';`
- **Consumers:** ACTIVE ✅

**Component Features:**
- CSV/JSON export format selection
- Downloads filtered data
- Integrates with filter store
- Success/error notifications

**Type Definitions:**
- Has `ExportControl.d.ts` (type definitions only, NOT a TS implementation)

**Status:** ✅ ACTIVE - Currently in use by EnhancedEventTable
**Recommended Action:** CONVERT to TypeScript (Phase 3 - high priority)

---

### 15. SparklineChart.jsx 🟡

**Location:** `/mnt/c/Projects/dexter/frontend/src/components/Visualization/SparklineChart.jsx`
**Lines of Code:** 146

**Import Analysis:**
- **Direct Imports:** 0
- **Index Re-exports:** 0
- **Documentation:** Referenced in README.md only

**Component Features:**
- D3.js-based sparkline visualization
- Trend percentage calculation
- Loading skeleton
- Customizable dimensions/colors

**Status:** 🟡 POTENTIALLY UNUSED - Only in documentation
**Recommended Action:** VERIFY runtime usage, then DELETE or CONVERT

---

## Naming Conflict Analysis

### Header.jsx vs Header.tsx ✅ NO CONFLICT

**Confirmed:** These are TWO DIFFERENT components in DIFFERENT directories:

1. **EventDetail/components/Header.jsx**
   - Purpose: Header section for event detail view
   - Shows: Error title, level, platform, timestamp, Sentry links
   - Used by: NOTHING (unused)

2. **Header.tsx** (root components/)
   - Purpose: Application header with navigation
   - Shows: Logo, settings, user menu, shortcuts
   - Used by: Layout.tsx ✅

**Conclusion:** No conflict - safe to delete Header.jsx

---

## Safe Deletion Order

### Phase 1: Immediate Deletion (Zero Risk)
**12 files with NO imports - safe to delete immediately:**

```bash
# EventDetail component files
rm frontend/src/components/EventDetail/components/Actions.jsx
rm frontend/src/components/EventDetail/components/BreadcrumbsSection.jsx
rm frontend/src/components/EventDetail/components/ContextSection.jsx
rm frontend/src/components/EventDetail/components/ErrorMessage.jsx
rm frontend/src/components/EventDetail/components/EventStatistics.jsx
rm frontend/src/components/EventDetail/components/Header.jsx
rm frontend/src/components/EventDetail/components/RelatedEvents.jsx
rm frontend/src/components/EventDetail/components/ReleaseInfo.jsx
rm frontend/src/components/EventDetail/components/RequestSection.jsx
rm frontend/src/components/EventDetail/components/Stacktrace.jsx
rm frontend/src/components/EventDetail/components/TagsSection.jsx
rm frontend/src/components/EventDetail/components/UserSection.jsx

# Update index file (remove all exports since nothing uses them)
rm frontend/src/components/EventDetail/components/index.ts
```

**Files to Delete:**
1. ✅ Actions.jsx
2. ✅ BreadcrumbsSection.jsx
3. ✅ ContextSection.jsx
4. ✅ ErrorMessage.jsx
5. ✅ EventStatistics.jsx
6. ✅ Header.jsx (no conflict with Header.tsx)
7. ✅ RelatedEvents.jsx
8. ✅ ReleaseInfo.jsx
9. ✅ RequestSection.jsx
10. ✅ Stacktrace.jsx
11. ✅ TagsSection.jsx
12. ✅ UserSection.jsx

**Also delete:**
- ✅ `index.ts` (no longer needed)

---

### Phase 2: Verification Required

#### SparklineChart.jsx 🟡
**Action:** Verify usage before deletion
```bash
# Search for runtime usage (not just README)
grep -r "SparklineChart" frontend/src --include="*.tsx" --include="*.ts" --exclude-dir=node_modules
# If no results: DELETE
# If found: CONVERT to TypeScript
```

#### EnhancedEventDetail.jsx 🟡
**Action:** Confirm EventDetail.tsx provides all needed functionality
```bash
# Check if enhanced features (deadlock, AI) are needed
# Decision tree:
# - If features NOT needed: DELETE
# - If features ARE needed: CONVERT to TypeScript
# - Current status: NOT USED, likely can DELETE
```

**Recommended:** DELETE both (no active usage found)

---

### Phase 3: Conversion to TypeScript

#### ExportControl.jsx ✅ HIGH PRIORITY
**Action:** Convert to TypeScript (BLOCKS other cleanup)

**Current blocker:**
- Used by: `EnhancedEventTable.tsx`
- Cannot delete: ACTIVE usage

**Conversion steps:**
1. Create `ExportControl.tsx` with proper types
2. Update import in `EnhancedEventTable.tsx`
3. Test export functionality (CSV/JSON)
4. Delete `ExportControl.jsx`
5. Delete `ExportControl.d.ts`

**Type additions needed:**
```typescript
interface ExportControlProps {
  // Add props if component becomes configurable
}

interface ExportOptions {
  organizationSlug: string;
  projectSlug: string;
  format: 'csv' | 'json';
  status?: string;
  query?: string;
}
```

---

## Risk Assessment

### ✅ Zero Risk (12 files)
All EventDetail component JSX files have NO imports - **safe to delete immediately**

### 🟡 Low Risk (2 files)
- **SparklineChart.jsx** - Only in README, likely unused
- **EnhancedEventDetail.jsx** - Exported but not imported

### 🔴 Medium Risk (1 file)
- **ExportControl.jsx** - ACTIVE usage, must convert not delete

---

## Validation Checklist

### Phase 1 Validation (After Deletion)
- [ ] Build passes: `npm run build`
- [ ] Type check passes: `npm run typecheck`
- [ ] No broken imports
- [ ] Git status shows 13 deleted files

### Phase 2 Validation (After Verification)
- [ ] SparklineChart usage verified
- [ ] EnhancedEventDetail decision made
- [ ] Additional deletions completed (if applicable)

### Phase 3 Validation (After Conversion)
- [ ] ExportControl.tsx created with proper types
- [ ] Import in EnhancedEventTable.tsx updated
- [ ] Export functionality tested (CSV + JSON)
- [ ] Original JSX and .d.ts files deleted
- [ ] Build and tests pass

---

## Completion Checklist

- [x] All 15 JSX files identified
- [x] Import locations documented
- [x] TypeScript equivalents verified
- [x] Safe deletion order established
- [x] Conversion complexity assessed
- [x] Risk mitigation planned

---

## Key Findings

1. **No Naming Conflicts:** Header.jsx ≠ Header.tsx (different components)
2. **High Deletion Rate:** 80% of JSX files are unused (12 of 15)
3. **Index Re-exports Unused:** `components/index.ts` exports 12 JSX files with ZERO consumers
4. **Old API Usage:** EnhancedEventDetail.jsx uses old API patterns (not unified client)
5. **Type Definitions Only:** ExportControl.d.ts is NOT a TypeScript implementation
6. **Feature Gap:** EventDetail.tsx lacks deadlock + AI features from EnhancedEventDetail.jsx

---

## Recommended Next Steps

1. ✅ **Execute Phase 1** - Delete 12 unused EventDetail component JSX files (DEBT-A1-T1b)
2. 🔍 **Verify Phase 2** - Check SparklineChart and EnhancedEventDetail usage
3. 🔧 **Convert Phase 3** - Transform ExportControl.jsx to TypeScript (DEBT-A1-T2)
4. 🧪 **Test** - Validate builds and functionality after each phase
5. 📝 **Document** - Update CLAUDE.md with cleanup results

---

**Analysis Status:** ✅ COMPLETE
**Next Task:** DEBT-A1-T1b - Delete unused JSX files (Phase 1)
**Estimated Time:**
- Phase 1: 5 minutes
- Phase 2: 10 minutes
- Phase 3: 30 minutes
**Total Technical Debt Reduction:** ~2,000 lines of code
