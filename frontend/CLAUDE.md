# Claude Memory File

This file contains important information about the Dexter project that Claude should remember between sessions.

## Project Overview

Dexter is an application for monitoring, analyzing and explaining errors from Sentry. It provides:
- Error visualization and categorization
- AI-powered error explanations with context-aware prompting
- Deadlock detection and analysis
- Custom querying and analytics
- Advanced observability and accessibility features

## Project Status

### Phase 1 Implementation Status

| Task | Status | Description |
|------|--------|-------------|
| 2.1 | ✅ Complete | Context-aware prompting for LLM integration (AI error explanations) |
| 2.2 | ✅ Complete | Keyboard navigation with global shortcuts |
| 2.3 | ✅ Complete | Extended keyboard navigation to all components |
| 3.1 | ✅ Complete | UI Polish & Form Controls & Validation |
| 3.2 | ✅ Complete | UI Polish & Final Integration - UI Improvements |
| 3.3 | ✅ Complete | UI Polish & Final Integration - Documentation Updates |

Overall Phase 1 progress: 100% complete

### API Client Migration Status

| Task | Status | Description |
|------|--------|-------------|
| DEXTER-301 | ✅ Complete | Create compatibility layer for smooth migration |
| DEXTER-302 | ✅ Complete | Migrate EventTable components to new API client |
| DEXTER-303 | ✅ Complete | Migrate DeadlockDisplay components to new API client |
| DEXTER-304 | ✅ Complete | Migrate Settings components to new API client |
| DEXTER-305 | ✅ Complete | Migrate ExplainError component to new API client |
| DEXTER-306 | ✅ Complete | Remove obsolete API files after migration |

Current API Client Migration progress: 100% complete

### Backend API Fixes (Completed May 16, 2025)

All backend API endpoint errors have been fixed:
- ✅ Fixed CORS configuration parsing in settings.py
- ✅ Fixed AI router f-string syntax error in llm_service.py  
- ✅ Fixed organization alerts missing imports
- ✅ Backend runs successfully on http://localhost:8000
- ✅ All routes are properly registered at /api/v1/*

### Codebase Structure

The frontend codebase is structured as:
- `src/api/` - API integration with backend
  - `src/api/unified/` - New unified API client architecture
    - `apiConfig.ts` - API endpoints configuration
    - `enhancedApiClient.ts` - Core API client with advanced features
    - `pathResolver.ts` - Dynamic path resolution  
    - `errorHandler.ts` - Unified error handling
    - Domain-specific API modules (eventsApi.ts, issuesApi.ts, etc.)
    - React Query hooks for each domain (in `hooks/` directory)
  - `src/api/archived/` - Deprecated API modules (for backward compatibility)
    - Legacy API files with deprecation notices
    - Re-exports from unified API for smooth migration
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/store/` - Global state management
- `src/utils/` - Utility functions
- `src/theme/` - Theme configuration
- `src/docs/` - Documentation files

### ESM Module Configuration

The frontend is configured as an ESM module (`"type": "module"` in package.json). This means:
- Imports must include file extensions (.js for runtime compatibility)
- TypeScript files use .js extensions in imports (TypeScript resolves these correctly)
- This is the official TypeScript recommendation for ESM modules
- Both .ts and .js files exist in the unified API directory

### Recent Improvements

1. **API Endpoint Error Fixes (May 16, 2025)**
   - Fixed CORS configuration parsing error in backend
   - Fixed AI router syntax error with f-strings
   - Fixed organization alerts missing model imports
   - Verified all backend routes are properly registered
   - Backend now runs successfully, resolving all 404 errors

2. **Context-Aware AI Prompting**
   - Implemented comprehensive error analysis with 50+ distinct error categories
   - Created domain-specific prompt templates for specialized AI explanations
   - Added advanced stack trace analysis and root cause inference
   - Integrated with Ollama LLM for high-quality error explanations
   - Built flexible prompting architecture with multiple configuration levels
   - Added error context panel with diagnostic information
   - Provided settings for user control of AI behavior
   - Created comprehensive documentation and guides

3. **Unified API Client Architecture**
   - Implemented enhanced API client with caching, retries, and error handling
   - Created path resolver for dynamic API path generation
   - Added Zod validation for type-safe responses
   - Built domain-specific API modules with proper error handling
   - Integrated with React Query for data fetching
   - Archived all legacy API files with deprecation notices
   - Added comprehensive tests for all API modules and hooks
   - Created integration tests for key components
   - Added complete developer documentation

4. **Component Migrations**
   - Migrated all major components to use unified API client:
     - EventTable components
     - DeadlockDisplay components
     - ExplainError component
     - ModelSelector components
     - Settings components
   - Updated relevant hooks to use the unified API
   - Added comprehensive error handling for all API calls

5. **Form Validation Framework**
   - Created comprehensive form validation in `src/utils/formValidation.ts`
   - Implemented validation rules for all form components
   - Added real-time validation feedback

6. **UI Modernization**
   - Implemented VSCode/Notion-inspired UI styling
   - Enhanced theme with consistent color tokens and spacing
   - Redesigned header and navbar for better usability

7. **Keyboard Navigation**
   - Implemented global shortcuts via `useGlobalShortcuts` hook
   - Added component-specific keyboard navigation
   - Created keyboard shortcuts guide

## Development Commands

- Run the development server: `npm run dev`
- Run tests: `npm test`
- Build for production: `npm run build`
- Lint code: `npm run lint`
- Type checking: `npm run typecheck`

## Configuration

### Required Configuration

1. **Sentry Connection**
   - Organization slug: Required for connecting to Sentry API
   - Project slug: Required for accessing project data

2. **AI Model Configuration**
   - Active model: Currently using LLM via Ollama
   - Default options: maxTokens, promptTemplate, context-prompting

## Important Files

### Context-Aware Prompting System
- `/frontend/src/utils/enhancedErrorAnalytics.ts` - Enhanced error analysis engine
- `/frontend/src/utils/enhancedPromptEngineering.ts` - Prompt engineering system
- `/frontend/src/context/PromptEngineeringContext.tsx` - Context provider for prompt engine
- `/frontend/src/components/ExplainError/ErrorContext.tsx` - UI for error analysis
- `/frontend/src/components/ExplainError/ExplainError.tsx` - Main AI explanation component

### API Client Architecture
- `/frontend/src/api/unified/apiConfig.ts` - API endpoints configuration (using .js imports for ESM)
- `/frontend/src/api/unified/enhancedApiClient.ts` - Core API client implementation
- `/frontend/src/api/unified/pathResolver.ts` - Dynamic path resolution
- `/frontend/src/api/unified/errorHandler.ts` - Unified error handling system
- `/frontend/src/api/unified/eventsApi.ts` - Events API module with unified interface
- `/frontend/src/api/unified/issuesApi.ts` - Issues API module with unified interface
- `/frontend/src/api/unified/analyzersApi.ts` - Analyzers API module for deadlock analysis
- `/frontend/src/api/unified/aiApi.ts` - AI/Models API module for explanations
- `/frontend/src/api/unified/metricsApi.ts` - Metrics API module for performance tracking
- `/frontend/src/api/unified/templateApi.ts` - Templates API module for prompt management
- `/frontend/src/api/unified/configApi.ts` - Configuration API module for app settings (using .js imports for ESM)
- `/frontend/src/api/unified/hooks/useEvents.ts` - Events API React Query hooks
- `/frontend/src/api/unified/hooks/useIssues.ts` - Issues API React Query hooks
- `/frontend/src/api/unified/hooks/useAi.ts` - AI API React Query hooks
- `/frontend/src/api/unified/hooks/useMetrics.ts` - Metrics API React Query hooks
- `/frontend/src/api/unified/hooks/useTemplates.ts` - Templates API React Query hooks
- `/frontend/src/api/unified/hooks/useConfig.ts` - Configuration API React Query hooks

### Documentation
- `/docs/consolidated/CONTEXT_AWARE_PROMPTING.md` - Context-aware prompting documentation
- `/docs/consolidated/UNIFIED_API_DEVELOPER_GUIDE.md` - Complete developer guide
- `/docs/consolidated/API_MIGRATION_COMPLETE.md` - Migration summary report
- `/docs/consolidated/API_MIGRATION_MASTER_GUIDE.md` - Migration master guide

### UI Components and Utilities
- `/frontend/src/utils/formValidation.ts` - Form validation framework
- `/frontend/src/theme/theme.ts` - Theme configuration
- `/frontend/src/components/Settings/SettingsInput.tsx` - Connection settings
- `/frontend/src/components/Settings/AIModelSettings.tsx` - AI model settings
- `/frontend/src/hooks/useGlobalShortcuts.ts` - Keyboard shortcuts system
- `/frontend/src/hooks/useTableKeyboardNavigation.ts` - Table-specific keyboard navigation

### Migrated Components
- `/frontend/src/components/EventTable/EventTable.tsx` - Basic event table
- `/frontend/src/components/EventTable/EnhancedEventTable.tsx` - Advanced event table with filtering
- `/frontend/src/components/DeadlockDisplay/DeadlockDisplay.tsx` - Deadlock visualization
- `/frontend/src/components/Settings/SettingsInput.tsx` - Connection settings component
- `/frontend/src/components/Settings/AIModelSettings.tsx` - AI model settings component
- `/frontend/src/components/ExplainError/ExplainError.tsx` - AI-powered error explanation component
- `/frontend/src/components/ModelSelector/ModelSelector.tsx` - AI model selection component
- `/frontend/src/components/ModelSelector/ModelSelector.jsx` - Legacy AI model selection component

### Archived API Files
- `/frontend/src/api/archived/enhancedDeadlockApi.ts` - Replaced by unified analyzersApi.ts
- `/frontend/src/api/archived/aiApi.ts` - Replaced by unified aiApi.ts
- `/frontend/src/api/archived/modelApi.ts` - Replaced by unified aiApi.ts
- `/frontend/src/api/archived/analyticsApi.ts` - Replaced by unified analyticsApi.ts
- `/frontend/src/api/archived/errorAnalyticsApi.ts` - Replaced by unified analyticsApi.ts
- `/frontend/src/api/archived/eventApi.ts` - Replaced by unified eventsApi.ts
- `/frontend/src/api/archived/eventsApi.ts` - Replaced by unified eventsApi.ts
- `/frontend/src/api/archived/issuesApi.ts` - Replaced by unified issuesApi.ts
- `/frontend/src/api/archived/discoverApi.ts` - Replaced by unified discoverApi.ts
- `/frontend/src/api/archived/alertsApi.ts` - Replaced by unified alertsApi.ts
- `/frontend/src/api/archived/deadlockApi.ts` - Replaced by unified analyzersApi.ts

## Developer Notes

1. Context-Aware Prompting System
   - Use the PromptEngineeringContext for AI-related components
   - Leverage the error analysis tools when working with errors
   - Extend specialized templates when adding new error types
   - Follow the pattern in enhancedPromptEngineering.ts for template creation
   - Refer to the comprehensive guide at `docs/consolidated/CONTEXT_AWARE_PROMPTING.md`

2. Always use the unified API client for new components and migrations
   - Import from `src/api/unified` rather than individual API files
   - Use the React Query hooks when possible for data fetching
   - Add proper error handling for all API calls

3. Follow the unified API architecture patterns
   - Use domain-specific API modules for direct API calls: `api.events.getEvents()`
   - Use React Query hooks in components: `useEvents(), useIssues(), useAi()`
   - Implement proper error handling with the error handler
   - Validate all responses with Zod schemas for runtime type safety
   - Write tests for new API functionality
   - Refer to the comprehensive developer guide at `docs/consolidated/UNIFIED_API_DEVELOPER_GUIDE.md`

4. API Client Best Practices
   - Always include proper error handling for all API calls
   - Use request options for timeout, caching, and retries when needed
   - Leverage React Query's caching and state management
   - Use the appropriate error handling strategies based on context

5. ESM Module Import Patterns
   - Use .js extensions in imports (required for ESM modules)
   - TypeScript will correctly resolve .js imports to .ts files
   - This is the official TypeScript recommendation for ESM
   - Both .ts and .js files may exist in the codebase during migration

6. UI and Components
   - Always use the theme tokens for styling instead of hardcoded values
   - Use the form validation framework for all form components
   - Make sure keyboard navigation works for new components
   - Ensure all components follow the design system guidelines in `UI_IMPROVEMENTS.md`

7. Quality and Testing
   - Run linting and type checking before submitting changes
   - Test API integrations with appropriate error cases
   - Add unit tests for new components when possible