// File: src/components/ErrorHandling/ErrorContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ErrorContextValue {
  lastError: Error | null;
  setError: (error: Error | null) => void;
  clearError: () => void;
}

interface ErrorContextProviderProps {
  children: ReactNode;
}

// Create context with default values
const ErrorContext = createContext<ErrorContextValue>({
  lastError: null,
  setError: () => {},
  clearError: () => {}
});

/**
 * Error Context Provider component
 * 
 * Provides global error state management for the application
 */
export const ErrorContextProvider: React.FC<ErrorContextProviderProps> = ({ children }) => {
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const setError = (error: Error | null) => {
    setLastError(error);
    if (error) {
      console.error('Error set in context:', error);
    }
  };
  
  const clearError = () => {
    setLastError(null);
  };
  
  const value: ErrorContextValue = {
    lastError,
    setError,
    clearError
  };
  
  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

/**
 * Custom hook to access the error context
 */
export const useErrorContext = (): ErrorContextValue => {
  const context = useContext(ErrorContext);
  
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorContextProvider');
  }
  
  return context;
};

// Don't export ErrorContext as default as it's not a component
// The useErrorContext hook should be used to access the context
// If needed, we can export the context itself for advanced use cases
export { ErrorContext };
