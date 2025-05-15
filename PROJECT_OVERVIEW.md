# Dexter Project Overview

## Introduction

Dexter is an intelligent companion tool designed to enhance the Sentry.io experience. It provides a user-friendly interface to explore Sentry issues, leverage AI for error explanations, and perform enhanced error analysis, making observability more accessible and actionable.

## Project Structure

```
/
├─ backend/                     # Python FastAPI backend
│  ├─ app/                      # Main application code
│  │  ├─ config/                # Configuration management
│  │  │  ├─ api/                # API configuration and paths
│  │  │  └─ providers/          # AI provider configurations
│  │  ├─ core/                  # Core framework functionality
│  │  ├─ middleware/            # Request/response middleware
│  │  ├─ models/                # Data models and schemas
│  │  │  └─ api/                # API-specific models
│  │  ├─ routers/               # API endpoints
│  │  │  └─ api/                # Versioned API routes
│  │  ├─ services/              # Business logic services
│  │  └─ utils/                 # Utility functions
│  ├─ config/                   # Config files (YAML)
│  ├─ tests/                    # Backend test suite
│  └─ venv/                     # Python virtual environment
│
├─ frontend/                    # React frontend
│  ├─ public/                   # Static assets
│  ├─ scripts/                  # Build and utility scripts
│  ├─ src/                      # Source code
│  │  ├─ api/                   # API clients
│  │  │  ├─ archived/           # Legacy API modules
│  │  │  └─ unified/            # New unified API architecture
│  │  │     └─ hooks/           # React Query hooks
│  │  ├─ components/            # React components
│  │  │  ├─ AIMetrics/          # AI performance metrics
│  │  │  ├─ DeadlockDisplay/    # PostgreSQL deadlock visualization
│  │  │  ├─ ErrorHandling/      # Error boundary components
│  │  │  ├─ EventTable/         # Main event listing table
│  │  │  ├─ ExplainError/       # AI error explanation
│  │  │  └─ ...                 # Other component directories
│  │  ├─ hooks/                 # Custom React hooks
│  │  ├─ pages/                 # Page components
│  │  ├─ router/                # Routing configuration
│  │  ├─ store/                 # Global state management
│  │  ├─ theme/                 # UI theme configuration
│  │  ├─ types/                 # TypeScript type definitions
│  │  └─ utils/                 # Utility functions
│  ├─ tests/                    # Frontend test suite
│  └─ node_modules/             # NPM dependencies
│
├─ docs/                        # Documentation
│  ├─ api/                      # API documentation
│  ├─ architecture/             # Architecture diagrams
│  ├─ consolidated/             # Consolidated guides
│  └─ final/                    # Final documentation
│
└─ scripts/                     # Project-level utility scripts
```

## Key Technologies

### Backend
- **Python 3.10+**: Core programming language
- **FastAPI**: Web framework for building APIs
- **Pydantic**: Data validation and settings management
- **Uvicorn**: ASGI server for running the application
- **HTTPX**: Async HTTP client for external APIs
- **Poetry**: Dependency management

### Frontend
- **React**: UI library for building components
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tooling and development server
- **Mantine UI**: Component library
- **TanStack Query**: Data fetching and state management
- **D3.js**: Data visualization library
- **Zustand**: Lightweight state management

### AI Integration
- **Ollama**: Local LLM integration
- **Context-aware prompting**: Enhanced error analysis
- **Commercial API integration**: Optional OpenAI/Anthropic support

## Key Features

1. **Event Explorer**
   - Advanced filtering and sorting
   - Multi-select for bulk actions
   - Visual indicators for frequency and impact

2. **AI-Powered Analysis**
   - Plain-language error explanations
   - Context-aware prompting system
   - Multi-model support

3. **PostgreSQL Deadlock Analyzer**
   - Visual representation of deadlocks
   - Transaction and lock analysis
   - Resolution recommendations

4. **Enhanced Visualization**
   - Event frequency sparklines
   - User impact metrics
   - Interactive data visualizations

5. **Performance Metrics Dashboard**
   - AI model performance tracking
   - Response time and success rate monitoring
   - Cost estimation for commercial providers

## Project Status

The project has completed all planned phases:
- **Phase 1**: Foundational Improvements (100% complete)
- **Phase 2**: Scalability & Performance (100% complete)
- **Phase 3**: Compliance & Accessibility (100% complete)
- **Phase 4**: AI & Integration (100% complete)

## Setup Instructions

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Documentation

For detailed information, refer to:
- `README.md`: Project overview and setup
- `docs/final/`: Comprehensive documentation
- `DEVELOPMENT_GUIDE.md`: Guide for developers
- `TROUBLESHOOTING.md`: Common issues and solutions

## License

[Your License Information]