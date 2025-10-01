# CLAUDE.md - Ultimate AI Coding Guidelines for Claude Code

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

[... rest of the existing content remains the same ...]

## Memories

- API Client Migration has been completed with comprehensive integration with React Query
- Keyboard navigation has been implemented throughout the application with global shortcuts
- Context-aware AI prompting has been implemented with 50+ error categories
- Multi-model support has been implemented with provider abstraction and fallback chains
- Prompt templates system has been implemented with versioning and variable substitution
- Added monitoring system with Prometheus and Grafana integration
- Implemented health checks for all integrated services
- Created comprehensive system metrics tracking
- Added UI components for system status monitoring
- Documented monitoring setup and alerting configuration
- Added deployment scripts for production and development monitoring
- Minor bug fixes and performance enhancements have been applied to AI context and prompt generation
- Improved error handling and logging for external API integrations
- Optimized caching mechanisms for AI model responses
- Status and rules have been updated to reflect current project state and ongoing development
- Alert Health Monitoring System has been fully implemented providing comprehensive alert rule analysis, storm detection, and threshold optimization capabilities
- Fixed API client hook import issues in UnifiedModelSelector and AIModelSettings components (May 2025)
- Created ModelSelector wrapper component for backward compatibility (May 2025)
- Updated hooks exports to explicitly include all AI-related hooks (May 2025)
- Final consolidation report created in API_CLIENT_CONSOLIDATION_STATUS.md (May 2025)
- Comprehensive UI/UX audit completed identifying configuration redundancy issues (January 2025)
- Technical debt report created with prioritized remediation plan (January 2025)
- Master implementation backlog created in DEXTER_MASTER_BACKLOG.md (January 2025)

## Main Backlog

The primary implementation backlog is maintained in `DEXTER_MASTER_BACKLOG.md`. This backlog follows a sequential execution model designed for solo AI development with the following structure:

1. **EPIC A: Critical Technical Debt Resolution** (Weeks 1-3)
   - Configuration consolidation
   - API path standardization
   - Error boundary implementation

2. **EPIC B: Analyzer Framework Implementation** (Weeks 4-6)
   - Base analyzer protocol
   - PostgreSQL Deadlock Analyzer
   - Promise Rejection Analyzer
   - N+1 Query Analyzer

3. **EPIC C: Business Intelligence Integration** (Weeks 7-9)
   - External system connectors
   - Business impact calculations
   - Executive dashboard

4. **Final Integration & Polish** (Week 10)

Each EPIC includes comprehensive debug rounds with automated fixes applied after completion. All development follows the coding guidelines specified in this document.

## Backlog Execution Guidelines

When executing tasks from DEXTER_MASTER_BACKLOG.md:
1. Follow the sequential order - complete all tasks in a User Story before moving to the next
2. Apply debug rounds after each EPIC completion
3. Maintain test coverage above 80% for new code
4. Update progress in the backlog as tasks are completed
5. Flag any blockers or deviations from the plan immediately