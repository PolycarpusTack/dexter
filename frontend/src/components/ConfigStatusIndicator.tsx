import React, { useEffect, useState } from 'react';
import { Badge, Tooltip, Group, Text, Loader } from '@mantine/core';
import { IconCheck, IconAlertCircle, IconSettings } from '@tabler/icons-react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { hooks } from '../api/unified';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';

const { useCheckConfig } = hooks;

interface ConfigStatusIndicatorProps {
  showDetails?: boolean;
}

export function ConfigStatusIndicator({ showDetails = true }: ConfigStatusIndicatorProps) {
  const navigate = useNavigate();
  const { organizationSlug, projectSlug } = useAuthStore((state) => ({
    organizationSlug: state.organizationSlug,
    projectSlug: state.projectSlug,
  }));
  
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error' | 'checking'>('disconnected');
  
  // Use the config check mutation
  const configMutation = useCheckConfig();
  
  // Subscribe to real-time config updates
  useRealtimeUpdates({
    onMessage: (message) => {
      if (message.type === 'config_status') {
        setConnectionStatus(message.data.status);
        setLastChecked(new Date());
      }
    }
  });
  
  // Check connection status on mount and when config changes
  useEffect(() => {
    if (organizationSlug && projectSlug) {
      checkConnection();
    } else {
      setConnectionStatus('disconnected');
    }
  }, [organizationSlug, projectSlug]);
  
  // Check connection periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (organizationSlug && projectSlug) {
        checkConnection();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [organizationSlug, projectSlug]);
  
  // Handle mutation state changes
  useEffect(() => {
    if (configMutation.isLoading) {
      setConnectionStatus('checking');
    } else if (configMutation.isSuccess) {
      setConnectionStatus('connected');
      setLastChecked(new Date());
    } else if (configMutation.isError) {
      setConnectionStatus('error');
      setLastChecked(new Date());
    }
  }, [configMutation.isLoading, configMutation.isSuccess, configMutation.isError]);
  
  const checkConnection = () => {
    if (organizationSlug && projectSlug) {
      configMutation.mutate({
        organization_slug: organizationSlug,
        project_slug: projectSlug
      });
    }
  };
  
  const handleClick = () => {
    navigate('/config');
  };
  
  // Determine visual state
  const getStatusConfig = () => {
    if (!organizationSlug || !projectSlug) {
      return {
        color: 'gray',
        icon: <IconSettings size={14} />,
        label: 'Not Configured',
        tooltip: 'Click to configure Sentry connection'
      };
    }
    
    switch (connectionStatus) {
      case 'checking':
        return {
          color: 'blue',
          icon: <Loader size={14} />,
          label: 'Checking...',
          tooltip: 'Verifying connection to Sentry'
        };
      case 'connected':
        return {
          color: 'green',
          icon: <IconCheck size={14} />,
          label: showDetails ? `${organizationSlug} / ${projectSlug}` : 'Connected',
          tooltip: `Connected to Sentry${lastChecked ? ` • Last checked: ${lastChecked.toLocaleTimeString()}` : ''}`
        };
      case 'error':
        return {
          color: 'red',
          icon: <IconAlertCircle size={14} />,
          label: 'Connection Error',
          tooltip: 'Failed to connect to Sentry. Click to check configuration.'
        };
      default:
        return {
          color: 'yellow',
          icon: <IconAlertCircle size={14} />,
          label: 'Disconnected',
          tooltip: 'Not connected to Sentry. Click to configure.'
        };
    }
  };
  
  const statusConfig = getStatusConfig();
  
  return (
    <Tooltip label={statusConfig.tooltip} position="bottom">
      <Badge
        variant="dot"
        color={statusConfig.color}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
        leftSection={statusConfig.icon}
      >
        {statusConfig.label}
      </Badge>
    </Tooltip>
  );
}

export default ConfigStatusIndicator;