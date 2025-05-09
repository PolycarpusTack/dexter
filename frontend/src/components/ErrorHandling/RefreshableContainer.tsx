// File: src/components/ErrorHandling/RefreshableContainer.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Paper, 
  Text, 
  Group, 
  ActionIcon, 
  Tooltip, 
  Loader,
  useMantineTheme,
  Box
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { RefreshableContainerProps } from '../../types/errorHandling';

/**
 * Refreshable container for data components
 * 
 * Provides refresh functionality and can automatically refresh on interval
 */
const RefreshableContainer: React.FC<RefreshableContainerProps> = ({
  children,
  title,
  onRefresh,
  showRefreshButton = false,
  refreshInterval = 0, // 0 means no auto-refresh
  actions
}) => {
  const theme = useMantineTheme();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Handle refresh action
  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);
  
  // Set up auto-refresh interval if enabled
  useEffect(() => {
    if (refreshInterval > 0 && onRefresh) {
      const intervalId = setInterval(handleRefresh, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, handleRefresh, onRefresh]);
  
  // Format time since last refresh
  const formatTimeSince = (): string => {
    const diffMs = new Date().getTime() - lastRefreshed.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}h ago`;
  };
  
  return (
    <Paper withBorder radius="md" p="md">
      {/* Header with title and refresh button */}
      {(title || showRefreshButton || actions) && (
        <Group position="apart" mb="md">
          {title && <Text fw={500}>{title}</Text>}
          
          <Group spacing="xs">
            {actions}
            
            {onRefresh && showRefreshButton && (
              <Group spacing={4}>
                {!isRefreshing && (
                  <Text size="xs" color="dimmed">
                    Last updated: {formatTimeSince()}
                  </Text>
                )}
                
                <Tooltip label="Refresh data">
                  <ActionIcon
                    onClick={handleRefresh}
                    loading={isRefreshing}
                    size="sm"
                    color="blue"
                    variant="subtle"
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>
        </Group>
      )}
      
      {/* Content */}
      <Box>
        {children}
      </Box>
    </Paper>
  );
};

export default RefreshableContainer;
