// React import required for JSX
import React, { useState } from 'react';
import { Stack, NavLink, Text, Group, Box, Badge, ThemeIcon, ActionIcon, Tooltip, Divider } from '@mantine/core';
import { 
  IconDashboard, 
  IconBug, 
  IconBell, 
  IconSearch, 
  IconActivity, 
  IconChartBar, 
  IconSettings,
  IconPlus,
  IconChevronRight,
  IconBrain,
  IconRobot
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AIModelSettings from './Settings/AIModelSettings';
import SettingsInput from './Settings/SettingsInput';

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
}

const NavSection = ({ title, children }: NavSectionProps) => (
  <Box mb="md">
    <Text 
      size="xs" 
      fw={600} 
      tt="uppercase" 
      c="dimmed" 
      px="sm" 
      mb="xs"
      style={{ letterSpacing: '0.03em' }}
    >
      {title}
    </Text>
    {children}
  </Box>
);

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>('main');

  const mainLinks = [
    { 
      label: 'Dashboard', 
      icon: IconDashboard, 
      path: '/', 
      description: 'Overview of all metrics and issues',
      shortcut: 'G D'
    },
    { 
      label: 'Issues', 
      icon: IconBug, 
      path: '/issues', 
      description: 'View and manage Sentry issues',
      shortcut: 'G I',
      badge: { label: '12', color: 'red' }
    },
    { 
      label: 'Events', 
      icon: IconActivity, 
      path: '/events', 
      description: 'Raw event stream and details',
      shortcut: 'G E'
    },
    { 
      label: 'Discover', 
      icon: IconSearch, 
      path: '/discover', 
      description: 'Custom queries and analytics',
      shortcut: 'G Q'
    },
  ];
  
  const monitoringLinks = [
    { 
      label: 'Alert Rules', 
      icon: IconBell, 
      path: '/alert-rules', 
      description: 'Configure and manage alerts',
      badge: { label: 'New', color: 'blue' }
    },
    { 
      label: 'Performance', 
      icon: IconChartBar, 
      path: '/performance', 
      description: 'Application performance metrics',
      disabled: true
    },
    { 
      label: 'AI Metrics', 
      icon: IconBrain, 
      path: '/ai-metrics', 
      description: 'AI model performance and usage metrics',
      badge: { label: 'New', color: 'green' }
    },
  ];

  // Renders a nav link with enhanced styling and features
  const renderNavLink = (link: any) => (
    <NavLink
      key={link.path}
      label={
        <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
          <Text>{link.label}</Text>
          {link.badge && (
            <Badge 
              size="xs" 
              variant={link.badge.color === 'red' ? 'filled' : 'light'} 
              color={link.badge.color}
            >
              {link.badge.label}
            </Badge>
          )}
        </Group>
      }
      description={link.description ? 
        <Text size="xs" c="dimmed" style={{ marginTop: 2 }}>{link.description}</Text> : 
        undefined
      }
      leftSection={
        <ThemeIcon 
          variant="light" 
          color={link.disabled ? 'gray' : location.pathname === link.path ? 'blue' : 'gray'} 
          size="sm" 
          radius="sm"
        >
          <link.icon size={16} />
        </ThemeIcon>
      }
      rightSection={
        link.shortcut ? (
          <Text size="xs" c="dimmed" ff="monospace">
            {link.shortcut}
          </Text>
        ) : undefined
      }
      onClick={() => !link.disabled && navigate(link.path)}
      active={location.pathname === link.path}
      disabled={link.disabled}
      style={(theme) => ({
        borderRadius: theme.radius.sm,
        marginBottom: 4,
        opacity: link.disabled ? 0.6 : 1,
      })}
    />
  );

  return (
    <>
      <Box p="md">
        {/* Configuration section with settings components */}
        <Box mb="md">
          <SettingsInput />
          <AIModelSettings />
        </Box>
        
        <Divider my="md" />
        
        {/* Main navigation sections */}
        <NavSection title="Main">
          {mainLinks.map(renderNavLink)}
        </NavSection>
        
        <NavSection title="Monitoring">
          {monitoringLinks.map(renderNavLink)}
          
          {/* "Create New Alert" item */}
          <NavLink
            label="Create New Alert"
            leftSection={
              <ThemeIcon variant="light" color="green" size="sm" radius="sm">
                <IconPlus size={16} />
              </ThemeIcon>
            }
            onClick={() => navigate('/alert-rules/new')}
            style={(theme) => ({
              borderRadius: theme.radius.sm,
              marginBottom: 4,
              borderStyle: 'dashed',
              borderWidth: 1,
              borderColor: theme.colors.gray[3],
            })}
          />
        </NavSection>
        
        {/* Bottom section with configuration link */}
        <Box 
          style={{ 
            position: 'absolute', 
            bottom: 20, 
            left: 0, 
            right: 0, 
            padding: '0 12px' 
          }}
        >
          <NavLink
            label="Configuration"
            leftSection={
              <ThemeIcon variant="light" color="gray" size="sm" radius="sm">
                <IconSettings size={16} />
              </ThemeIcon>
            }
            rightSection={<IconChevronRight size={14} />}
            onClick={() => navigate('/settings')}
            style={(theme) => ({
              borderRadius: theme.radius.sm,
            })}
          />
        </Box>
      </Box>
    </>
  );
}
