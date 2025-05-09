// File: frontend/src/components/ErrorHandling/ErrorContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import { RecoveryService } from '../../utils/errorRecovery';

// Create context
const ErrorContext = createContext({
  boundaries: [],
  registerBoundary: () => {},
  unregisterBoundary: () => {},
  getRegisteredBoundaries: () => [],
  getErrorsCount: () => 0,
  reportError: () => {},
  clearErrors: () => {},
});

/**
 * Error Context Provider that manages error boundary registration and shared state
 * This allows for global monitoring of all error boundaries in the app
 */
export function ErrorContextProvider({ children }) {
  // State to track registered error boundaries
  const [boundaries, setBoundaries] = useState([]);
  // State to track errors across the application
  const [errors, setErrors] = useState([]);
  
  // Register a new error boundary
  const registerBoundary = useCallback((boundary) => {
    setBoundaries(prev => {
      // Avoid duplicate registrations
      if (prev.some(b => b.id === boundary.id)) {
        return prev;
      }
      return [...prev, boundary];
    });
    
    return () => unregisterBoundary(boundary.id);
  }, []);
  
  // Unregister an error boundary
  const unregisterBoundary = useCallback((boundaryId) => {
    setBoundaries(prev => prev.filter(b => b.id !== boundaryId));
    
    // Also clear any errors associated with this boundary
    setErrors(prev => prev.filter(e => e.boundaryId !== boundaryId));
  }, []);
  
  // Get all registered boundaries
  const getRegisteredBoundaries = useCallback(() => {
    return boundaries;
  }, [boundaries]);
  
  // Get count of active errors
  const getErrorsCount = useCallback(() => {
    return errors.length;
  }, [errors]);
  
  // Report a new error
  const reportError = useCallback((error, boundaryId, metadata = {}) => {
    const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    
    setErrors(prev => [
      ...prev,
      {
        id: errorId,
        error,
        boundaryId,
        timestamp: new Date(),
        metadata,
        recoveryStrategy: RecoveryService.determineStrategy(error)
      }
    ]);
    
    return errorId;
  }, []);
  
  // Clear all errors or errors for a specific boundary
  const clearErrors = useCallback((boundaryId) => {
    if (boundaryId) {
      setErrors(prev => prev.filter(e => e.boundaryId !== boundaryId));
    } else {
      setErrors([]);
    }
  }, []);
  
  // Context value
  const contextValue = {
    boundaries,
    registerBoundary,
    unregisterBoundary,
    getRegisteredBoundaries,
    getErrorsCount,
    reportError,
    clearErrors,
    errors,
  };
  
  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
}

// Hook to use the error context
export function useErrorContext() {
  const context = useContext(ErrorContext);
  
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorContextProvider');
  }
  
  return context;
}

export default ErrorContext;
