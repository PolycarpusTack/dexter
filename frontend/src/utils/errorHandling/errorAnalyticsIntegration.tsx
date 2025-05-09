// File: src/utils/errorHandling/errorAnalyticsIntegration.tsx

import React, { useContext, createContext, ReactNode, useEffect, useState } from 'react';
import { EnhancedError } from '../errorFactory';
import errorAnalyticsService from '../../services/errorAnalyticsService';

interface ErrorReportingContextValue {
  reportError: (error: Error, context?: Record<string, any>) => void;
  errorCount: number;
  lastErrorTime: Date | null;
}

export const ErrorReportingContext = createContext<ErrorReportingContextValue>({
  reportError: () => {},
  errorCount: 0,
  lastErrorTime: null,
});

interface ErrorReportingProviderProps {
  children: ReactNode;
  applicationId?: string;
  environment?: string;
  version?: string;
  disabled?: boolean;
}

/**
 * Error reporting provider for integration with analytics systems
 */
export const ErrorReportingProvider: React.FC<ErrorReportingProviderProps> = ({
  children,
  applicationId = 'dexter-app',
  environment = 'development',
  version = '1.0.0',
  disabled = false,
}) => {
  const [errorCount, setErrorCount] = useState<number>(0);
  const [lastErrorTime, setLastErrorTime] = useState<Date | null>(null);
  
  // Initialize error analytics service
  useEffect(() => {
    if (!disabled) {
      errorAnalyticsService.initialize({
        applicationId,
        environment,
        version,
      });
    }
    
    return () => {
      errorAnalyticsService.shutdown();
    };
  }, [applicationId, environment, version, disabled]);
  
  // Report error to analytics service
  const reportError = (error: Error, context: Record<string, any> = {}): void => {
    if (disabled) return;
    
    // Update local state
    setErrorCount((prev) => prev + 1);
    setLastErrorTime(new Date());
    
    // Extract helpful information from EnhancedError
    const metadata: Record<string, any> = {
      ...context,
    };
    
    if (error instanceof EnhancedError) {
      metadata.category = error.category;
      metadata.retryable = error.retryable;
      metadata.retryCount = error.retryCount;
      
      if (error.metadata) {
        metadata.errorMetadata = error.metadata;
      }
    }
    
    // Report to service
    errorAnalyticsService.reportError(error, metadata);
  };
  
  const value: ErrorReportingContextValue = {
    reportError,
    errorCount,
    lastErrorTime,
  };
  
  return (
    <ErrorReportingContext.Provider value={value}>
      {children}
    </ErrorReportingContext.Provider>
  );
};

/**
 * Hook to use error reporting
 */
export const useErrorReporting = (): ErrorReportingContextValue => {
  const context = useContext(ErrorReportingContext);
  
  if (!context) {
    throw new Error('useErrorReporting must be used within an ErrorReportingProvider');
  }
  
  return context;
};

export default {
  ErrorReportingProvider,
  useErrorReporting,
};
