# Dexter System Overview

This document provides a comprehensive overview of the Dexter application, including its functionality, architecture, and key components.

## What is Dexter?

Dexter is an enhanced monitoring and observability tool that integrates with Sentry.io to provide developers with AI-powered error analysis, advanced visualization, and proactive alert management. The application helps developers understand and resolve issues faster, optimize alert thresholds, and gain deeper insights into application errors.

## Key Features

### 1. Enhanced Error Analysis

- **AI-Powered Explanations**: Uses large language models to analyze errors and provide human-readable explanations
- **Multi-Model Support**: Integrates with multiple AI providers (OpenAI, Anthropic, Ollama) with fallback chains
- **Context-Aware Prompting**: Customizes prompts based on error type and context for more relevant explanations

### 2. Advanced Error Visualization

- **PostgreSQL Deadlock Analysis**: Visualizes database deadlocks with interactive graphs showing blocking relationships
- **Memory Leak Detection**: Identifies memory leaks with allocation tracking and heap analysis
- **N+1 Query Detection**: Detects and visualizes inefficient database query patterns
- **Interactive Event Tables**: Provides enhanced filtering, sorting, and visualization of Sentry events

### 3. Alert Health Monitoring

- **Alert Storm Detection**: Identifies periods of unusually high alert frequency
- **Threshold Optimization**: Suggests optimized alert thresholds based on historical patterns
- **Alert Health Metrics**: Monitors and scores the effectiveness of alert rules

### 4. System Monitoring

- **Resource Usage Tracking**: Monitors CPU, memory, disk, and network usage
- **Service Health Checks**: Monitors the health of connected services
- **Prometheus Integration**: Exports metrics for advanced monitoring and alerting

## Technical Architecture

### Backend (Python/FastAPI)

- **Core Framework**: FastAPI for high-performance API endpoints
- **Data Validation**: Pydantic for schema validation and data modeling
- **Async Processing**: Asynchronous request handling for maximum performance
- **Error Handling**: Comprehensive error handling and graceful degradation
- **API Integration**: Sentry API client with enhanced path resolution and caching
- **Configuration Management**: Multi-mode configuration (default, debug, minimal, enhanced)
- **Cache Service**: Redis-compatible caching for performance optimization

### Frontend (React/TypeScript)

- **Core Framework**: React with TypeScript for type safety
- **UI Components**: Mantine UI library for modern interface elements
- **Data Fetching**: React Query for server state management with caching
- **Client State**: Zustand for lightweight UI state management
- **Visualization**: D3.js for advanced data visualization
- **Routing**: React Router for navigation
- **Accessibility**: ARIA-compliant components with keyboard navigation
- **Error Boundaries**: Comprehensive error handling with graceful fallbacks

### AI Integration

- **Multi-Provider Support**: OpenAI, Anthropic, and Ollama integration
- **Prompt Engineering**: Context-aware prompt templates with versioning
- **Fallback Chains**: Automatic fallback between models for reliability
- **Streaming Responses**: Progressive rendering of AI-generated content

### Deployment

- **Containerization**: Docker support for consistent deployment
- **Kubernetes**: Deployment configurations for container orchestration
- **Monitoring**: Prometheus and Grafana integration for operational insights
- **Environment Support**: Development, staging, and production configurations

## Core Modules

### Backend Modules

- **app/models/**: Data models for all system entities
- **app/routers/**: API endpoint definitions and routing
- **app/services/**: Business logic and external service integration
- **app/utils/**: Utility functions and helpers
- **app/core/**: Core application configuration and setup

### Frontend Modules

- **src/api/**: API client with unified interface
- **src/components/**: UI components organized by feature
- **src/hooks/**: Custom React hooks for shared logic
- **src/pages/**: Page-level components
- **src/store/**: Application state management
- **src/utils/**: Utility functions and helpers

## Integration Points

1. **Sentry API Integration**
   - Event data retrieval and analysis
   - Issue tracking and management
   - Alert rule configuration and optimization

2. **AI Provider Integration**
   - OpenAI API for GPT model access
   - Claude API for Anthropic models
   - Ollama for local AI model deployment

3. **Monitoring Integration**
   - Prometheus for metrics collection
   - Grafana for visualization and alerting
   - Custom health checks for service monitoring

## Performance Considerations

- **Frontend Optimizations**:
  - React Query for optimized API calls and caching
  - Virtualized lists for handling large datasets
  - Progressive rendering for responsive UI
  - Code splitting for reduced bundle size

- **Backend Optimizations**:
  - Async processing for non-blocking operations
  - Caching layer for frequently accessed data
  - Efficient path resolution for API calls
  - Request batching and deduplication

## Security Features

- **Authentication**: Token-based authentication for API security
- **Authorization**: Role-based access control for sensitive operations
- **Data Masking**: Sensitive data masking in logs and UI
- **Secure API Access**: Secure handling of API tokens and credentials

## Current Development Focus

The current development focus is on:

1. **API Client Consolidation**: Streamlining the frontend API clients into a unified interface
2. **Python 3.13 Compatibility**: Ensuring the backend works with the latest Python version
3. **Alert Health Monitoring**: Enhancing the alert optimization capabilities
4. **External API Integration**: Adding support for custom external APIs

## Future Roadmap

1. **Enhanced AI Analysis**: More specialized AI models for different error types
2. **Advanced Visualization**: Additional visualization options for complex data
3. **Predictive Alerting**: Machine learning for predictive alert thresholds
4. **Expanded Integration**: Additional third-party service integrations
5. **Mobile Support**: Responsive design for mobile access

---

This overview provides a comprehensive understanding of the Dexter application's capabilities, architecture, and key components. For specific implementation details, please refer to the codebase and associated documentation.