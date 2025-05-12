# Dexter Documentation

## Overview

Welcome to the Dexter documentation repository. This documentation provides comprehensive information about the Dexter application, a Sentry Observability Companion designed to enhance error monitoring, analysis, and resolution workflows.

## Table of Contents

1. [System Architecture](./SYSTEM_ARCHITECTURE.md)
2. [API Documentation](./API_DOCUMENTATION.md)
3. [Error Handling](./ERROR_HANDLING.md)
4. [Deadlock Analyzer](./DEADLOCK_ANALYZER.md)
5. [Development Guide](./DEVELOPMENT_GUIDE.md)
6. [Keyboard Navigation](./KEYBOARD_NAVIGATION.md)
7. [Integration Guide](./INTEGRATION_GUIDE.md)
8. [Troubleshooting](./TROUBLESHOOTING.md)

## Quick Start

To get started with Dexter:

1. Clone the repository
2. Install dependencies with `npm run install:all`
3. Start the development server with `npm run frontend:dev` and `npm run backend:dev` in separate terminals

## Project Structure

Dexter follows a monorepo structure:

```
dexter/
├── frontend/         # React frontend application
├── backend/          # FastAPI backend application
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── tests/            # Test suites
```

## Key Features

1. **Enhanced Error Analysis**: Extended capabilities beyond Sentry's native functionality
2. **Deadlock Detection**: Advanced tools for identifying and resolving deadlocks
3. **AI-Powered Recommendations**: Intelligent suggestions for error resolution
4. **Real-time Monitoring**: Live updates for critical issues
5. **Custom Visualizations**: Specialized data visualization for error patterns
6. **Keyboard Navigation**: Advanced keyboard shortcuts for efficient workflows
7. **Bulk Operations**: Streamlined handling of multiple events/issues

## Contributing

Please see the [Development Guide](./DEVELOPMENT_GUIDE.md) for information on contributing to Dexter.

## License

This project is licensed under the terms specified in the LICENSE file.
