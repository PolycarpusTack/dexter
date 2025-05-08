// File: src/components/ErrorHandling/withDataFetching.tsx

import React from 'react';
import { QueryStatus, UseQueryResult } from '@tanstack/react-query';
import { Button, Paper, Text, Group, Stack, Alert, Skeleton } from '@mantine/core';
import { IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import withErrorBoundary from './withErrorBoundary';

/**
 * Interface for loading state component props
 */
interface LoadingStateProps {
  /** Optional custom loading message */
  loadingMessage?: string;
  /** Number of skeleton rows to show */
  skeletonRows?: number;
  /** Optional custom loading component */
  customLoadingComponent?: React.ReactNode;
}

/**
 * Default loading state component
 */
const DefaultLoadingState: React.FC<LoadingStateProps> = ({ 
  loadingMessage = 'Loading data...',
  skeletonRows = 3,
  customLoadingComponent
}) => {
  if (customLoadingComponent) {
    return <>{customLoadingComponent}</>;
  }
  
  return (
    <Stack spacing="md">
      <Text size="sm" color="dimmed">{loadingMessage}</Text>
      {Array.from({ length: skeletonRows }).map((_, index) => (
        <Skeleton key={`skeleton-${index}`} height={50} radius="sm" />
      ))}
    </Stack>
  );
};

/**
 * Interface for error state component props
 */
interface ErrorStateProps {
  /** Error that occurred */
  error: Error | unknown;
  /** Function to retry the operation */
  onRetry: () => void;
  /** Optional custom error message */
  errorMessage?: string;
  /** Optional custom error component */
  customErrorComponent?: React.ReactNode;
}

/**
 * Default error state component
 */
const DefaultErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  errorMessage,
  customErrorComponent
}) => {
  if (customErrorComponent) {
    return <>{customErrorComponent}</>;
  }

  // Extract error message
  const message = error instanceof Error ? error.message : 
    (errorMessage || 'An error occurred while loading data');
  
  return (
    <Alert 
      icon={<IconAlertCircle size={16} />} 
      title="Error Loading Data" 
      color="red" 
      variant="outline"
      mb="md"
    >
      <Text mb="sm">{message}</Text>
      <Button 
        leftSection={<IconRefresh size={16} />} 
        onClick={onRetry} 
        variant="light" 
        color="red" 
        size="sm"
      >
        Retry
      </Button>
    </Alert>
  );
};

/**
 * Interface for empty state component props
 */
interface EmptyStateProps {
  /** Optional custom empty message */
  emptyMessage?: string;
  /** Optional retry function */
  onRetry?: () => void;
  /** Optional custom empty component */
  customEmptyComponent?: React.ReactNode;
}

/**
 * Default empty state component
 */
const DefaultEmptyState: React.FC<EmptyStateProps> = ({
  emptyMessage = 'No data found',
  onRetry,
  customEmptyComponent
}) => {
  if (customEmptyComponent) {
    return <>{customEmptyComponent}</>;
  }
  
  return (
    <Paper p="xl" withBorder>
      <Stack align="center" spacing="md">
        <Text>{emptyMessage}</Text>
        {onRetry && (
          <Button 
            leftSection={<IconRefresh size={16} />} 
            onClick={onRetry} 
            variant="light"
          >
            Refresh
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

/**
 * Interface for withDataFetching options
 */
interface WithDataFetchingOptions<TData, TError> {
  /** Function to determine if data is empty */
  isEmpty?: (data: TData) => boolean;
  /** Loading state props */
  loadingProps?: LoadingStateProps;
  /** Error state props */
  errorProps?: Omit<ErrorStateProps, 'error' | 'onRetry'>;
  /** Empty state props */
  emptyProps?: Omit<EmptyStateProps, 'onRetry'>;
  /** Custom data extractor for the wrapped component */
  dataExtractor?: (result: UseQueryResult<TData, TError>) => TData;
  /** Error boundary options */
  errorBoundaryOptions?: Parameters<typeof withErrorBoundary>[1];
}

/**
 * Higher-Order Component that handles data fetching states
 * 
 * @param Component - The component to wrap
 * @param options - Configuration options
 * @returns Wrapped component with data fetching states
 */
export function withDataFetching<TData, TError = unknown, P extends { data: TData }>(
  Component: React.ComponentType<P>,
  options: WithDataFetchingOptions<TData, TError> = {}
): React.FC<Omit<P, 'data'> & { queryResult: UseQueryResult<TData, TError> }> {
  // Get component name for better debugging
  const componentName = Component.displayName || Component.name || 'Component';
  
  // Create the wrapper component
  const WrappedComponent: React.FC<Omit<P, 'data'> & { queryResult: UseQueryResult<TData, TError> }> = (props) => {
    const { queryResult, ...restProps } = props;
    const { 
      isEmpty = (data: TData) => !data || (Array.isArray(data) && data.length === 0),
      loadingProps = {},
      errorProps = {},
      emptyProps = {},
      dataExtractor = (result) => result.data as TData
    } = options;
    
    // Extract query state
    const { status, data, error, refetch } = queryResult;
    
    // Handle loading state
    if (status === 'loading') {
      return <DefaultLoadingState {...loadingProps} />;
    }
    
    // Handle error state
    if (status === 'error') {
      return (
        <DefaultErrorState 
          error={error} 
          onRetry={() => refetch()} 
          {...errorProps} 
        />
      );
    }
    
    // Extract data
    const extractedData = dataExtractor(queryResult);
    
    // Handle empty state
    if (isEmpty(extractedData)) {
      return (
        <DefaultEmptyState 
          onRetry={() => refetch()} 
          {...emptyProps} 
        />
      );
    }
    
    // Render the component with data
    return <Component data={extractedData} {...(restProps as any)} />;
  };
  
  // Set display name for easier debugging
  WrappedComponent.displayName = `withDataFetching(${componentName})`;
  
  // Wrap with error boundary
  return withErrorBoundary(WrappedComponent, options.errorBoundaryOptions);
}

export default withDataFetching;
