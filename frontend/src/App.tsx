// File: frontend/src/App.tsx

import React, { useEffect, lazy, Suspense } from 'react';
import { 
  AppShell, 
  Burger, 
  Group, 
  Title, 
  Text, 
  UnstyledButton, 
  Divider,
  Avatar,
  ThemeIcon,
  Tooltip,
  useMantineTheme,
  LoadingOverlay,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { 
  IconBrandSentry, 
  IconDashboard, 
  IconBug, 
  IconSettings,
  IconChartBar,
  IconInfoCircle,
  IconExternalLink
} from '@tabler/icons-react';
// Lazy load heavy components
// @ts-ignore
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsInput = lazy(() => import('./components/Settings/SettingsInput').then(module => ({ default: module.default })));

import { AppErrorBoundary, ErrorBoundary } from './components/ErrorHandling';
import ErrorFallback from './components/ErrorHandling/ErrorFallback';
import AccessibleIcon from './components/UI/AccessibleIcon';
import { initErrorTracking } from './utils/errorTracking';
import packageInfo from '../package.json';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function App(): JSX.Element {
  const [opened, { toggle }] = useDisclosure();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // Initialize error tracking on component mount
  useEffect(() => {
    initErrorTracking({
      environment: (import.meta as any).env.MODE,
      release: (packageInfo as any).version || '1.0.0'
    });
  }, []);

  // Navigation items with icons and accessibility labels
  const navItems: NavItemProps[] = [
    { 
      icon: <IconDashboard size={20} />, 
      label: 'Dashboard', 
      active: true,
      onClick: () => {/* In a real app, this would navigate */} 
    },
    { 
      icon: <IconBug size={20} />, 
      label: 'Issues', 
      active: false,
      onClick: () => {/* In a real app, this would navigate */} 
    },
    { 
      icon: <IconChartBar size={20} />, 
      label: 'Analytics', 
      active: false,
      disabled: true, // Future feature
      onClick: () => {/* In a real app, this would navigate */} 
    },
  ];

  // Helper function for navigation items
  const NavItem: React.FC<NavItemProps> = ({ icon, label, active, disabled, onClick }) => (
    <Tooltip 
      label={disabled ? 'Coming soon' : label} 
      position="right" 
      disabled={isMobile}
    >
      <UnstyledButton
        onClick={onClick}
        styles={(theme: any) => ({ 
          root: { 
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: theme.spacing.sm,
            borderRadius: theme.radius.sm,
            color: active
              ? theme.colors.blue[7]
              : disabled
                ? theme.colors.gray[5]
                : theme.colors.gray[7],
            backgroundColor: active ? theme.colors.blue[0] : 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            '&:hover': {
              backgroundColor: !disabled && (active ? theme.colors.blue[1] : theme.colors.gray[0]),
            },
          }
        })}
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled}
      >
        <Group gap="xs">
          <AccessibleIcon icon={icon} label={label} />
          <Text size="sm" fw={active ? 600 : 400}>
            {label}
          </Text>
        </Group>
      </UnstyledButton>
    </Tooltip>
  );

  return (
    <AppErrorBoundary>
      <AppShell
        header={{ height: 60 }}
        navbar={{ 
          width: 280, 
          breakpoint: 'sm', 
          collapsed: { mobile: !opened },
        }}
        padding="md"
        styles={(theme) => ({
          main: {
            backgroundColor: theme.colors.gray[0],
          },
        })}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="apart">
            <Group>
              <Burger 
                opened={opened} 
                onClick={toggle} 
                hiddenFrom="sm" 
                size="sm"
                aria-label={opened ? "Close navigation menu" : "Open navigation menu"} 
              />
              <Group gap="xs">
                <ThemeIcon size="lg" variant="light" color="blue" radius="md">
                  <IconBrandSentry size={20} aria-hidden="true" />
                </ThemeIcon>
                <Title order={3} fw={600} style={{ letterSpacing: '-0.5px' }}>
                  Dexter
                </Title>
                <Tooltip label="Sentry Observability Companion">
                  <AccessibleIcon 
                    icon={<IconInfoCircle size={16} color={theme.colors.gray[6]} />} 
                    label="About Dexter" 
                  />
                </Tooltip>
              </Group>
            </Group>
            
            <Group>
              <Tooltip label="View Sentry Dashboard">
                <UnstyledButton
                  component="a"
                  href="https://sentry.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  styles={(theme: any) => ({
                    root: {
                      display: 'flex',
                      alignItems: 'center',
                      color: theme.colors.gray[6],
                      fontSize: theme.fontSizes.sm,
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: theme.radius.sm,
                      '&:hover': {
                        backgroundColor: theme.colors.gray[0],
                        color: theme.colors.gray[8],
                      },
                    }
                  })}
                >
                  <Group gap={4}>
                    <Text size="sm" hiddenFrom="md">Sentry</Text>
                    <IconExternalLink size={16} />
                  </Group>
                </UnstyledButton>
              </Tooltip>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AppShell.Section id="settings-section">
            <ErrorBoundary 
              fallback={(error, resetError) => (
                <ErrorFallback error={error} resetError={resetError} />
              )}
            >
              <Suspense fallback={<LoadingOverlay visible={true} />}>
                <SettingsInput />
              </Suspense>
            </ErrorBoundary>
          </AppShell.Section>
          
          <Divider my="sm" />
          
          <AppShell.Section grow>
            <Text size="xs" fw={500} color="dimmed" mb="xs" pl="sm">
              NAVIGATION
            </Text>
            {navItems.map((item) => (
              <NavItem key={item.label} {...item} />
            ))}
          </AppShell.Section>
          
          <AppShell.Section>
            <Divider my="sm" />
            <NavItem 
              icon={<IconSettings size={20} />} 
              label="Settings" 
              active={false}
              onClick={() => {/* Navigate to settings */}}
            />
            <Group p="sm" justify="apart" mt="md">
              <Group gap="xs">
                <Avatar 
                  size="sm" 
                  radius="xl" 
                  color="blue"
                  alt="User profile"
                >
                  U
                </Avatar>
                <div>
                  <Text size="xs" fw={500}>User</Text>
                  <Text size="xs" color="dimmed">Admin</Text>
                </div>
              </Group>
            </Group>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main>
          <ErrorBoundary 
            fallback={(error, resetError) => (
              <ErrorFallback error={error} resetError={resetError} />
            )}
          >
            <Suspense 
              fallback={
                <LoadingOverlay 
                  visible={true} 
                  overlayProps={{ radius: "sm", blur: 2 }} 
                />
              }
            >
              <DashboardPage />
            </Suspense>
          </ErrorBoundary>
        </AppShell.Main>
      </AppShell>
    </AppErrorBoundary>
  );
}

export default App;
