# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dexter is an intelligent companion tool designed to enhance Sentry.io experience. It provides a user-friendly interface to explore Sentry issues, leverage AI for error explanations, and perform enhanced error analysis.

## Environment Setup

### Prerequisites
- Python 3.10+
- Node.js (LTS version)
- Poetry (Python dependency manager)
- Ollama (for AI features)
- Sentry account with API token

### Backend Setup
```bash
cd backend
# Option 1: Using fix_dependencies.bat (recommended for Windows)
fix_dependencies.bat

# Option 2: Using Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install poetry
poetry install
# Copy example env file and edit with your Sentry API token
cp .env.example .env
```

### Frontend Setup
```bash
cd frontend
npm install
```

## Common Development Commands

### Backend Commands
```bash
# Run the backend server
cd backend
poetry shell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run with specific mode
set APP_MODE=debug && python -m app.main
set APP_MODE=minimal && python -m app.main
set APP_MODE=enhanced && python -m app.main
set APP_MODE=simplified && python -m app.main

# Python 3.13 Compatibility
# If using Python 3.13, run the compatibility script first:
cd backend
python fix_pydantic_compatibility.py
# Or use fix_dependencies.bat which will run it automatically

# Run tests
pytest
pytest --cov=app --cov-report=html
pytest tests/routers/test_events.py  # Run specific test file
pytest tests/integration/ -m integration  # Run integration tests
pytest tests/benchmarks/ -m slow  # Run performance benchmarks

# Code quality
black app/
isort app/
flake8 app/
mypy app/
```

### Frontend Commands
```bash
# Development server
cd frontend
npm run dev  # Starts server at http://localhost:5173

# Typecheck and lint
npm run typecheck
npm run lint

# Run tests
npm test
npm test -- --coverage
npm test -- --watch
npm test -- EventTable.test.tsx  # Run specific test file

# Build for production
npm run build
npm run build:prod  # Production optimized build
npm run build:analyze  # Analyze bundle size
```

## System Architecture

### Backend Architecture
- Built with FastAPI
- Domain-driven design with clear separation between:
  - Routers (API endpoints)
  - Services (Business logic)
  - Models (Data structures)
  - Utils (Helper functions)
- Multiple configurable modes (debug, minimal, enhanced, simplified)
- WebSocket support for real-time updates
- Integration with Sentry and Ollama APIs

### Frontend Architecture
- React 18 with TypeScript
- Component architecture:
  - UI components (reusable UI elements)
  - Feature components (specific features like EventTable, DeadlockDisplay)
  - Layout components
- State management:
  - Zustand for global UI state
  - React Query for server state and data fetching
- Error handling with ErrorBoundary components
- React Router for navigation
- Mantine UI for component library

## Key Features
- Event explorer with advanced filtering
- AI-powered error analysis using Ollama
- PostgreSQL deadlock analyzer
- Enhanced visualizations with D3.js
- Error boundaries and robust error handling

## Error Handling

The project has comprehensive error handling:
- Backend has global exception handlers
- Frontend uses ErrorBoundary components
- API error handling with proper feedback
- Retry mechanisms for transient failures

## Development Workflow
1. Create feature branches from main
2. Follow existing code patterns and architecture
3. Add tests for new functionality
4. Run lint and type checking before submitting PRs
5. Adhere to UI/UX guidelines for consistency

## Directory Structure

### Backend Structure
```
backend/
├── app/
│   ├── config/       # Application configuration
│   ├── core/         # Core framework
│   ├── models/       # Data models
│   ├── routers/      # API endpoints
│   ├── services/     # Business logic
│   └── utils/        # Utility functions
├── config/           # YAML configuration files
└── tests/            # Test files
```

### Frontend Structure
```
frontend/
├── src/
│   ├── api/          # API clients
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Page components
│   ├── store/        # State management
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
└── tests/            # Test files
```

## Coding Guidelines

The following guidelines should be followed when working with this codebase:

### Core Principles
- **Enterprise-Grade Quality**: Prioritize stability, robustness, security, and maintainability in all code.
- **Comprehensive Error Handling**: Implement thorough error handling at all potential failure points.
- **Clarity and Simplicity**: Write clean, maintainable code following KISS, DRY and YAGNI principles.
- **Security-First Approach**: Follow secure coding practices and be vigilant about potential vulnerabilities.

### Implementation Requirements
- Always include proper type annotations in both TypeScript and Python code
- Ensure all API interactions have proper error handling with retries where appropriate
- Follow the existing error boundary pattern for React components
- Use the existing design system and UI components for consistency
- Write unit tests for new functionality and maintain test coverage

### Code Review Process
- Self-review code for correctness, robustness, and adherence to guidelines
- Verify that comprehensive error handling is implemented
- Ensure changes don't break existing functionality
- Confirm that new code follows established patterns and architecture

### Testing Strategy
- Write unit tests for all non-trivial functions
- Test edge cases and error conditions
- Follow existing testing patterns in the codebase
- Ensure tests are pure and deterministic

## Project Status & Development Plan

### Current Project Status
The project is approximately 85% complete:
- Phase 1 (Foundational Improvements): 100% Complete
- Phase 2 (Scalability & Performance): 100% Complete
- Phase 3 (Compliance & Accessibility): 100% Complete 
- Phase 4 (AI & Integration): 75% Complete

### Unified API Client
A unified API client architecture has been implemented with:
- Enhanced API client for robust HTTP interactions
- Path resolver for dynamic API path generation
- Comprehensive error handling system
- Request caching and deduplication
- Automatic retries with exponential backoff
- Type-safe domain-specific API modules
- React Query hooks for data fetching

### JIRA Development Plan

#### Epic: API Client Migration (DEXTER-300) - 100% Complete
- DEXTER-301: Create compatibility layer for smooth migration ✅
- DEXTER-302: Migrate EventTable components to new API client ✅
- DEXTER-303: Migrate DeadlockDisplay components to new API client ✅
- DEXTER-304: Migrate Settings components to new API client ✅
- DEXTER-305: Migrate ExplainError component to new API client ✅
- DEXTER-306: Remove obsolete API files after migration ✅

#### Epic: Performance Optimizations (DEXTER-310) - 100% Complete
- DEXTER-311: Implement virtualized lists for tables ✅
- DEXTER-312: Implement progressive rendering for graph visualizations ✅
- DEXTER-313: Optimize component rendering with React.memo and useCallback ✅
- DEXTER-314: Add performance benchmarks and monitoring ✅

#### Epic: Accessibility Improvements (DEXTER-320) - 100% Complete
- DEXTER-321: Implement proper ARIA attributes ✅
- DEXTER-322: Enhance keyboard navigation ✅
- DEXTER-323: Implement guided tour system ✅
- DEXTER-324: Add screen reader announcements ✅

#### Epic: AI & Integration (DEXTER-400) - 75% Complete
- DEXTER-401: Context-Aware AI Prompting ✅
- DEXTER-402: Multi-Model Support ✅
- DEXTER-403: Prompt Templates System ✅
- DEXTER-404: External API Integration 🔄

### Implementation Timeline
- Phase 1: API Client Migration (2 weeks) ✅ Completed
- Phase 2: Performance Optimizations (2 weeks) ✅ Completed
- Phase 3: Accessibility & Observability (2 weeks) ✅ Completed
- Phase 4: AI & Integration (3 weeks) 🔄 In Progress (75% complete)
  - Week 1: Context-Aware AI Prompting ✅ Completed
  - Week 2: Multi-Model Support ✅ Completed
  - Week 3: Prompt Templates System ✅ Completed
  - Week 4: External API Integration 🔄 In Progress

### Current Priorities
1. External API Integration (DEXTER-404)
2. Final testing and documentation
3. Performance optimization for AI features

## Common Fixes

### Python Dependency Issues
If you encounter Python dependency issues, try these solutions:

1. Run `backend/fix_dependencies.bat` (Windows) to install all required dependencies with compatible versions.

2. For Pydantic compatibility issues, run:
   ```bash
   cd backend
   python fix_pydantic_compatibility.py
   ```

3. Key packages and versions:
   - fastapi==0.109.2
   - uvicorn[standard]==0.27.1
   - starlette==0.31.1
   - pydantic==2.3.0
   - pydantic-settings==2.0.3

### Frontend Issues
If you encounter frontend build or dependency issues:

1. Run `frontend/fix-dependencies.bat` (Windows)

2. For TypeScript errors, run:
   ```bash
   cd frontend
   npm run typecheck
   ```

3. For linting errors, run:
   ```bash
   cd frontend
   npm run lint
   ```

## Recent Implementations

### Context-Aware AI Prompting
- Implemented comprehensive error analysis with 50+ distinct error categories
- Created domain-specific prompt templates for specialized AI explanations
- Added advanced stack trace analysis and root cause inference
- Integrated with Ollama LLM for high-quality error explanations
- Built flexible prompting architecture with multiple configuration levels
- Added error context panel with diagnostic information
- Provided settings for user control of AI behavior
- Created comprehensive documentation and guides

### Multi-Model Support
- Implemented model registry for managing models from multiple providers
- Created provider abstraction layer with standardized interface
- Built fallback chain system for graceful degradation
- Added enhanced model selector UI with model capabilities
- Implemented user-specific model preferences
- Added model metadata tracking for capabilities and metrics
- Created comprehensive documentation and guides

### Prompt Templates System
- Implemented template management system with versioning and categories
- Created variable substitution engine for dynamic content
- Built template testing and preview functionality
- Added template management UI components
- Created default templates for common error categories
- Implemented SemVer-based template versioning
- Added comprehensive documentation in `PROMPT_TEMPLATES_SYSTEM.md`

## Memories

- API Client Migration has been completed with comprehensive integration with React Query
- Keyboard navigation has been implemented throughout the application with global shortcuts
- Context-aware AI prompting has been implemented with 50+ error categories
- Multi-model support has been implemented with provider abstraction and fallback chains
- Prompt templates system has been implemented with versioning and variable substitution
- ok, finish the project! I'm proud of you.