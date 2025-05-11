/**
 * Component showing real-time connection status
 */

import React from 'react';
import { Badge, Group, Indicator, Text, Tooltip } from '@mantine/core';
import { IconPlugConnected, IconPlugConnectedX, IconRefresh } from '@tabler/icons-react';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';

export function RealtimeStatus() {
  const { status, isConnected, lastUpdate, reconnect } = useRealtimeUpdates();

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
      case 'reconnecting':
        return 'yellow';
      case 'disconnected':
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    return isConnected ? (
      <IconPlugConnected size={16} />
    ) : (
      <IconPlugConnectedX size={16} />
    );
  };

  return (
    <Group gap="xs">
      <Tooltip
        label={
          <div>
            <Text size="sm">Real-time Updates</Text>
            {lastUpdate && (
              <Text size="xs" c="dimmed">
                Last update: {lastUpdate.toLocaleTimeString()}
              </Text>
            )}
          </div>
        }
      >
        <Indicator color={getStatusColor()} processing={status === 'connecting' || status === 'reconnecting'}>
          <Badge
            variant="light"
            color={getStatusColor()}
            leftSection={getStatusIcon()}
            rightSection={
              status === 'disconnected' || status === 'error' ? (
                <IconRefresh
                  size={14}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    reconnect();
                  }}
                />
              ) : null
            }
          >
            {getStatusText()}
          </Badge>
        </Indicator>
      </Tooltip>
    </Group>
  );
}
