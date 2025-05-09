// File: frontend/src/components/ErrorHandling/index.js

// Core error boundary components
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as AppErrorBoundary } from './AppErrorBoundary';
export { default as ErrorFallback } from './ErrorFallback';

// UI components
export { default as ErrorButton } from './components/ErrorButton';

// Error Context Provider
export { 
  default as ErrorContext,
  ErrorContextProvider,
  useErrorContext
} from './ErrorContext';

// HOC utilities
export { default as withErrorBoundary } from './withErrorBoundary';
export { default as withDataFetching } from './withDataFetching';

// Deprecated - use ErrorBoundary instead with appropriate configuration
// This maintains backward compatibility
export { default as SimpleErrorBoundary } from './SimpleErrorBoundary';
