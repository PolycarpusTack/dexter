// File: frontend/src/pages/DashboardPage.jsx

import React, { useRef } from 'react';
import { 
  Grid, 
  Paper, 
  Title, 
  Text, 
  Group, 
  Badge, 
  useMantineTheme,
  Breadcrumbs,
  Anchor,
  Flex,
  Box
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { 
  IconHome, 
  IconChevronRight, 
  IconBug,
  IconAlertCircle
} from '@tabler/icons-react';
import EventTable from '../components/EventTable';
import EventDetail from '../components/EventDetail';
import { ErrorBoundary } from '../components/ErrorHandling';
import ErrorFallback from '../components/ErrorHandling/ErrorFallback';
import InfoTooltip from '../components/UI/InfoTooltip';
import AccessibleIcon from '../components/UI/AccessibleIcon';
import useAppStore from '../store/appStore';

function DashboardPage() {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
  const eventTableRef = useRef(null);
  const eventDetailRef = useRef(null);
  
  const { organizationSlug, projectSlug } = useAppStore(
    (state) => ({
      organizationSlug: state.organizationSlug,
      projectSlug: state.projectSlug
    })
  );

  // Create breadcrumb items based on available organization/project info
  const breadcrumbItems = [
    { 
      title: 'Home', 
      href: '#', 
      icon: <IconHome size={14} /> 
    },
    { 
      title: organizationSlug || 'Organization', 
      href: '#',
    },
    { 
      title: projectSlug || 'Project', 
      href: '#',
    },
    { 
      title: 'Issues', 
      href: '#',
      icon: <IconBug size={14} />
    },
  ].filter(Boolean);

  return (
    <Box>
      {/* Breadcrumbs & Page Header */}
      <Paper 
        p="md" 
        radius={0} 
        mb="md"
        sx={{
          backgroundColor: 'white',
          boxShadow: theme.shadows.xs,
        }}
      >
        <Breadcrumbs
          separator={<IconChevronRight size={14} color={theme.colors.gray[5]} />}
          mb="xs"
        >
          {breadcrumbItems.map((item, index) => (
            <Anchor 
              href={item.href} 
              key={index}
              size="sm"
              sx={{ 
                color: index === breadcrumbItems.length - 1 
                  ? theme.colors.gray[7] 
                  : theme.colors.gray[6],
                textDecoration: 'none',
                fontWeight: index === breadcrumbItems.length - 1 ? 500 : 400,
              }}
            >
              <Group spacing={4}>
                {item.icon && (
                  <AccessibleIcon 
                    icon={item.icon} 
                    label={`${item.title} icon`} 
                  />
                )}
                <span>{item.title}</span>
              </Group>
            </Anchor>
          ))}
        </Breadcrumbs>
        
        <Flex justify="space-between" align="center">
          <Group spacing="xs">
            <Title order={2}>Issue Explorer</Title>
            <InfoTooltip 
              content="View and manage Sentry issues. Select an issue to see detailed information and AI-powered explanations."
              position="right"
            />
          </Group>
          
          {(organizationSlug && projectSlug) ? (
            <Badge 
              size="lg" 
              radius="sm" 
              color="blue" 
              variant="outline"
              leftSection={
                <AccessibleIcon 
                  icon={<IconBug size={12} />} 
                  label="Project active" 
                />
              }
            >
              {projectSlug}
            </Badge>
          ) : (
            <Badge 
              size="lg" 
              radius="sm" 
              color="yellow" 
              variant="outline"
              leftSection={
                <AccessibleIcon 
                  icon={<IconAlertCircle size={12} />} 
                  label="Configuration needed" 
                />
              }
            >
              Configure Sentry
            </Badge>
          )}
        </Flex>
      </Paper>
      
      {/* Main content */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Paper 
              withBorder 
              p="md" 
              shadow="xs" 
              radius="md"
              sx={{
                overflow: 'hidden',
                height: isMobile ? 'auto' : 'calc(100vh - 180px)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Flex gap="xs" align="center" mb="sm">
                <Title order={4}>Issues</Title>
                <Text size="sm" c="dimmed">
                  Select an issue to view details
                </Text>
              </Flex>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                }}
              >
                <EventTable ref={eventTableRef} />
              </Box>
            </Paper>
          </ErrorBoundary>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 5 }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Paper 
              withBorder 
              p="md" 
              shadow="xs" 
              radius="md" 
              sx={{ 
                height: isMobile ? 'auto' : 'calc(100vh - 180px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Title order={4} mb="sm">Event Details</Title>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                }}
              >
                <EventDetail ref={eventDetailRef} />
              </Box>
            </Paper>
          </ErrorBoundary>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

export default DashboardPage;
