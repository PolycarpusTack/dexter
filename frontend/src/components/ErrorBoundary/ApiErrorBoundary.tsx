import React from 'react';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import { Button, Text, Stack, Center, Loader } from '@mantine/core';
import { IconRefresh, IconWifi } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

interface ApiErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  fallback?: React.ReactNode;
}

interface ApiErrorFallbackProps {
  error: Error;
  resetError: () => void;
  onRetry?: () => void;
}

const ApiErrorFallback: React.FC<ApiErrorFallbackProps> = ({ error, resetError, onRetry }) => {
  const isNetworkError = error.message.includes('Network') || 
                         error.message.includes('fetch') ||
                         !navigator.onLine;

  // Check online status
  const { data: isOnline } = useQuery({
    queryKey: ['onlineStatus'],
    queryFn: () => navigator.onLine,
    refetchInterval: 5000,
    enabled: isNetworkError
  });

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      resetError();
    }
  };

  // Auto-retry when connection is restored
  React.useEffect(() => {
    if (isNetworkError && isOnline) {
      handleRetry();
    }
  }, [isOnline, isNetworkError]);

  if (isNetworkError && !isOnline) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <IconWifi size={48} stroke={1.5} />
          <Text size="lg" fw={500}>No Internet Connection</Text>
          <Text c="dimmed" ta="center">
            Please check your internet connection and try again.
          </Text>
          <Stack>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={handleRetry}
              variant="light"
            >
              Retry
            </Button>
            <Center>
              <Loader size="sm" variant="dots" />
              <Text size="sm" ml="xs">Waiting for connection...</Text>
            </Center>
          </Stack>
        </Stack>
      </Center>
    );
  }

  // Default API error display
  return (
    <Center h={400}>
      <Stack align="center" gap="md">
        <Text size="lg" fw={500}>Failed to Load Data</Text>
        <Text c="dimmed" ta="center" maw={400}>
          {error.message || 'An error occurred while fetching data.'}
        </Text>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleRetry}
        >
          Try Again
        </Button>
      </Stack>
    </Center>
  );
};

export const ApiErrorBoundary: React.FC<ApiErrorBoundaryProps> = ({
  children,
  onRetry,
  fallback
}) => {
  // Use our custom ApiErrorFallback if no fallback is provided
  // Create a proper ReactNode fallback for EnhancedErrorBoundary
  return (
    <EnhancedErrorBoundary
      fallback={
        fallback ? (
          fallback
        ) : (
          <ApiErrorFallback 
            error={new Error('An error occurred')} // This will be replaced by actual error
            resetError={() => {}} // This will be replaced by actual resetError
            onRetry={onRetry} 
          />
        )
      }
      resetOnPropsChange
      resetKeys={['children']}
    >
      {children}
    </EnhancedErrorBoundary>
  );
};

// Specialized error boundary for API-heavy components
export const withApiErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ApiErrorBoundaryProps>
): React.FC<P> => {
  const WrappedComponent = (props: P) => (
    <ApiErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ApiErrorBoundary>
  );

  WrappedComponent.displayName = `withApiErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
};
