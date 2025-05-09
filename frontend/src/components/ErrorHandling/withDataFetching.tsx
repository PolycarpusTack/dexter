// File: src/components/ErrorHandling/withDataFetching.tsx

import React, { useState, useEffect, ComponentType } from 'react';
import { Group, Loader, Text, Button } from '@mantine/core';
import { WithDataFetchingOptions } from '../../types/errorHandling';

/**
 * Default loading component
 */
const DefaultLoadingComponent = () => (
  <Group position="center" spacing="md" py="xl">
    <Loader size="md" />
    <Text>Loading data...</Text>
  </Group>
);

/**
 * Default error component
 */
const DefaultErrorComponent = ({ error, retry }: { error: Error, retry: () => void }) => (
  <Group position="center" direction="column" spacing="md" py="xl">
    <Text color="red">Error loading data: {error.message}</Text>
    <Button onClick={retry}>Retry</Button>
  </Group>
);

/**
 * Higher-order component for data fetching with loading and error states
 * 
 * @param fetchData - Function that returns a promise with the data
 * @param options - Additional options
 * @returns Component with data fetching capabilities
 */
export function withDataFetching<T, P extends { data?: T }>(
  fetchData: (props: P) => Promise<T>,
  options: WithDataFetchingOptions = {}
) {
  const {
    loadingComponent = <DefaultLoadingComponent />,
    errorComponent = DefaultErrorComponent
  } = options;
  
  // Return the HOC
  return (WrappedComponent: ComponentType<P & { data: T }>) => {
    // Return the enhanced component
    return function WithDataFetching(props: P): JSX.Element {
      const [data, setData] = useState<T | null>(null);
      const [isLoading, setIsLoading] = useState<boolean>(true);
      const [error, setError] = useState<Error | null>(null);
      
      // Fetch data function
      const fetchDataAndUpdateState = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const result = await fetchData(props);
          setData(result);
        } catch (err) {
          console.error('Error fetching data:', err);
          setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        } finally {
          setIsLoading(false);
        }
      };
      
      // Fetch data on mount and when dependencies change
      useEffect(() => {
        fetchDataAndUpdateState();
      }, []); // eslint-disable-line react-hooks/exhaustive-deps
      
      // Handle retry
      const handleRetry = () => {
        fetchDataAndUpdateState();
      };
      
      // Show loading state
      if (isLoading) {
        return <>{loadingComponent}</>;
      }
      
      // Show error state
      if (error) {
        if (typeof errorComponent === 'function') {
          return <>{errorComponent(error, handleRetry)}</>;
        }
        return <>{errorComponent}</>;
      }
      
      // Render component with data
      return <WrappedComponent {...props} data={data as T} />;
    };
  };
}

export default withDataFetching;
