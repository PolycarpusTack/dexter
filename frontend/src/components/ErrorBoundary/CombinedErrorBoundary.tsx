import React, { ReactNode } from 'react';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { ApiErrorBoundary } from './ApiErrorBoundary';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';

interface CombinedErrorBoundaryProps {
  children: ReactNode;
  routeName: string;
  enableApiErrorBoundary?: boolean;
  enableEnhancedFeatures?: boolean;
  enableAutoRecovery?: boolean;
  maxRecoveryAttempts?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Combines multiple error boundaries for comprehensive error handling
 * Order: Enhanced (if enabled) -> API (if enabled) -> Route (always)
 */
export function CombinedErrorBoundary({
  children,
  routeName,
  enableApiErrorBoundary = true,
  enableEnhancedFeatures = false,
  enableAutoRecovery = true,
  maxRecoveryAttempts = 3,
  onError
}: CombinedErrorBoundaryProps) {
  // Start with route error boundary (innermost)
  let content = (
    <RouteErrorBoundary
      routeName={routeName}
      enableAutoRecovery={enableAutoRecovery}
      maxRecoveryAttempts={maxRecoveryAttempts}
      onError={onError}
    >
      {children}
    </RouteErrorBoundary>
  );
  
  // Wrap with API error boundary if enabled
  if (enableApiErrorBoundary) {
    content = (
      <ApiErrorBoundary>
        {content}
      </ApiErrorBoundary>
    );
  }
  
  // Wrap with enhanced error boundary if enabled (outermost)
  if (enableEnhancedFeatures) {
    content = (
      <EnhancedErrorBoundary
        fallback={null}
        onError={onError}
        resetOnPropsChange={[routeName]}
      >
        {content}
      </EnhancedErrorBoundary>
    );
  }
  
  return content;
}

/**
 * HOC for wrapping components with combined error boundaries
 */
export function withCombinedErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  routeName: string,
  options?: Partial<CombinedErrorBoundaryProps>
) {
  return (props: P) => (
    <CombinedErrorBoundary routeName={routeName} {...options}>
      <Component {...props} />
    </CombinedErrorBoundary>
  );
}