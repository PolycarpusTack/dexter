// File: src/components/ErrorHandling/RefreshableContainer.tsx

import React, { useState } from 'react';
import { Paper, Button, Group, Stack, Text, Box, Loader, Alert } from '@mantine/core';
import { IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import ErrorBoundary from './ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';

/**
 * Props for the RefreshableContainer component
 */
export interface RefreshableContainerProps {
  /** Component title */
  title?: string;
  /** Children to render */
  children: React.ReactNode;
  /** Function to call when refreshing */
  onRefresh?: () => Promise<any>;
  /** Whether to refresh automatically on mount */
  refreshOnMount?: boolean;
  /** Whether to show refresh button */
  showRefreshButton?: boolean;
  /** Additional actions to show in the header */
  actions?: React.ReactNode;
  /** Optional ID for the container */
  id?: string;
  /** Additional class names */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * A container component that provides refresh capability and error handling
 */
const RefreshableContainer: React.FC<RefreshableContainerProps> = ({
  title,
  children,
  onRefresh,
  refreshOnMount = false,
  showRefreshButton = true,
  actions,
  id,
  className,
  style
}) => {
  // State for loading and error
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Create error handler
  const handleError = useErrorHandler('Refresh Failed');
  
  // Function to refresh content
  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh data'));
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh on mount if needed
  React.useEffect(() => {
    if (refreshOnMount && onRefresh) {
      handleRefresh();
    }
  }, [refreshOnMount, onRefresh]);
  
  return (
    <Paper
      p="md"
      withBorder
      radius="md"
      shadow="xs"
      id={id}
      className={className}
      style={style}
    >
      {/* Header */}
      {(title || onRefresh || actions) && (
        <Group position="apart" mb="md">
          {title && <Text fw={500}>{title}</Text>}
          <Group spacing="xs">
            {actions}
            {showRefreshButton && onRefresh && (
              <Button
                size="xs"
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={handleRefresh}
                loading={isLoading}
              >
                Refresh
              </Button>
            )}
          </Group>
        </Group>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <Box mb="md">
          <Group position="center">
            <Loader size="sm" />
            <Text size="sm" color="dimmed">Loading...</Text>
          </Group>
        </Box>
      )}
      
      {/* Error state */}
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          variant="filled"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error.message}
        </Alert>
      )}
      
      {/* Content with error boundary */}
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </Paper>
  );
};

export default RefreshableContainer;
