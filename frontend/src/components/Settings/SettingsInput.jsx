// File: frontend/src/components/Settings/SettingsInput.jsx

import React, { useState } from 'react';
import { 
  TextInput, 
  Button, 
  Group, 
  Stack, 
  Paper, 
  Text, 
  Alert,
  Divider,
  ThemeIcon,
  Collapse,
  Title,
  Tooltip,
  Badge,
  useMantineTheme,
  Tabs
} from '@mantine/core';
import { 
  IconSettings, 
  IconBrandSentry, 
  IconDatabase, 
  IconInfoCircle,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconRefresh,
  IconBrain
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import useAppStore from '../../store/appStore';
import { checkConfig } from '../../api/configApi';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';
import InfoTooltip from '../UI/InfoTooltip';
import AccessibleIcon from '../UI/AccessibleIcon';
import ModelSelector from '../ModelSelector/ModelSelector';

/**
 * SettingsInput component for configuring Sentry organization and project
 */
function SettingsInput() {
  const theme = useMantineTheme();
  // Use state instead of useDisclosure
  const [opened, setOpened] = useState(false);
  const toggle = () => setOpened((prev) => !prev);
  
  // Expose a function for external components to open the settings
  // This will be called via the DOM
  React.useEffect(() => {
    window.openSentrySettings = () => setOpened(true);
    return () => { delete window.openSentrySettings; };
  }, []);
  
  // Get state from global store
  const { organizationSlug, projectSlug, setOrgProject } = useAppStore(
    (state) => ({
      organizationSlug: state.organizationSlug,
      projectSlug: state.projectSlug,
      setOrgProject: state.setOrgProject,
    })
  );
  
  // Local form state
  const [orgInput, setOrgInput] = useState(organizationSlug || '');
  const [projectInput, setProjectInput] = useState(projectSlug || '');
  const [activeTab, setActiveTab] = useState('sentry');
  
  // Mutation for checking configuration
  const configMutation = useMutation({
    mutationFn: checkConfig,
    onSuccess: (data) => {
      // Backend returns the updated config directly
      if (data && data.organization_slug && data.project_slug) {
        setOrgProject(orgInput, projectInput);
        showSuccessNotification({
          title: 'Configuration Saved',
          message: `Connected to Sentry project: ${projectInput}`,
        });
      } else {
        showErrorNotification({
          title: 'Configuration Error',
          error: 'Invalid response from server',
        });
      }
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Configuration Error',
        error,
      });
    },
  });
  
  // Handler for saving configuration
  const handleSave = async () => {
    if (!orgInput.trim() || !projectInput.trim()) {
      showErrorNotification({
        title: 'Validation Error',
        error: 'Organization slug and project slug are required',
      });
      return;
    }
    
    // Call the mutation to check configuration
    configMutation.mutate({
      organization_slug: orgInput.trim(),
      project_slug: projectInput.trim(),
    });
  };
  
  // Config status badge
  const ConfigStatusBadge = () => {
    if (configMutation.isPending) {
      return (
        <Badge color="blue" variant="outline">
          Checking...
        </Badge>
      );
    }
    
    if (organizationSlug && projectSlug) {
      return (
        <Badge color="green" variant="outline" leftSection={<IconCheck size={12} />}>
          Connected
        </Badge>
      );
    }
    
    return (
      <Badge color="yellow" variant="outline">
        Not Configured
      </Badge>
    );
  };
  
  return (
    <Paper 
      withBorder 
      p="md" 
      radius="md" 
      className="settings-input"
      mb="xs"
      sx={(theme) => ({
        backgroundColor: organizationSlug && projectSlug 
          ? theme.fn.rgba(theme.colors.green[0], 0.5)
          : theme.fn.rgba(theme.colors.yellow[0], 0.5),
        borderColor: organizationSlug && projectSlug 
          ? theme.colors.green[3]
          : theme.colors.yellow[3],
      })}
    >
      {/* Header */}
      <Group position="apart" mb="xs">
        <Group spacing="xs">
          <ThemeIcon
            size="md"
            radius="md"
            color={organizationSlug && projectSlug ? 'green' : 'yellow'}
          >
            <IconSettings size={16} />
          </ThemeIcon>
          <Title order={5}>Configuration</Title>
        </Group>
        
        <Group spacing="xs">
          <ConfigStatusBadge />
          <Tooltip label={opened ? "Hide settings" : "Show settings"}>
            <div>
              <Button
                variant="subtle"
                color={organizationSlug && projectSlug ? 'green' : 'yellow'}
                size="xs"
                onClick={toggle}
                rightSection={opened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                aria-expanded={opened}
                aria-label={opened ? "Hide settings" : "Show settings"}
              >
                {opened ? "Hide" : "Settings"}
              </Button>
            </div>
          </Tooltip>
        </Group>
      </Group>
      
      {/* Current config summary (when collapsed) */}
      {!opened && organizationSlug && projectSlug && (
        <Group spacing="xs">
          <ThemeIcon
            size="xs"
            radius="xl"
            color="blue"
            variant="light"
          >
            <IconBrandSentry size={10} />
          </ThemeIcon>
          <Text size="sm">
            <Text span fw={500}>{organizationSlug}</Text>
            {' / '}
            <Text span fw={500}>{projectSlug}</Text>
          </Text>
        </Group>
      )}
      
      {/* Collapsed alert (when not configured) */}
      {!opened && (!organizationSlug || !projectSlug) && (
        <Alert
          color="yellow"
          icon={<IconInfoCircle size={16} />}
          radius="md"
          title="Configuration Required"
          variant="light"
          p="xs"
        >
          <Text size="xs">
            Please configure your Sentry organization and project to view issues.
          </Text>
        </Alert>
      )}
      
      {/* Expanded settings form */}
      <Collapse in={opened}>
        <Divider my="sm" />
        
        <Tabs 
          value={activeTab} 
          onChange={setActiveTab}
          variant="outline"
          mb="md"
        >
          <Tabs.List>
            <Tabs.Tab 
              value="sentry" 
              leftSection={<IconBrandSentry size={14} />}
            >
              Sentry
            </Tabs.Tab>
            <Tabs.Tab 
              value="ai" 
              leftSection={<IconBrain size={14} />}
            >
              AI Model
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
        
        {activeTab === 'sentry' && (
          <Stack spacing="xs">
            <Group spacing="xs" mb="xs">
              <ThemeIcon 
                size="sm" 
                radius="xl" 
                color="blue" 
                variant="light"
              >
                <IconBrandSentry size={14} />
              </ThemeIcon>
              <Text size="sm" fw={500}>
                Sentry Organization & Project
              </Text>
              <InfoTooltip
                content="Enter your Sentry organization slug and project slug to connect Dexter to your Sentry instance."
                size={14}
              />
            </Group>
            
            {/* Form fields */}
            <TextInput
              label="Organization Slug"
              placeholder="e.g., acme-corp"
              value={orgInput}
              onChange={(e) => setOrgInput(e.target.value)}
              required
              icon={<IconDatabase size={16} />}
              description="The slug of your Sentry organization"
              aria-label="Sentry organization slug"
              error={configMutation.isError && configMutation.error?.message?.includes('organization') ? 'Invalid organization' : null}
            />
            
            <TextInput
              label="Project Slug"
              placeholder="e.g., frontend"
              value={projectInput}
              onChange={(e) => setProjectInput(e.target.value)}
              required
              icon={<IconDatabase size={16} />}
              description="The slug of your Sentry project"
              aria-label="Sentry project slug"
              error={configMutation.isError && configMutation.error?.message?.includes('project') ? 'Invalid project' : null}
            />
            
            <Group position="right" mt="md">
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={() => {
                  setOrgInput(organizationSlug || '');
                  setProjectInput(projectSlug || '');
                }}
                variant="subtle"
                color="gray"
                disabled={configMutation.isPending}
              >
                Reset
              </Button>
              
              <Button
                onClick={handleSave}
                loading={configMutation.isPending}
                leftSection={<IconCheck size={16} />}
              >
                Save Configuration
              </Button>
            </Group>
            
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
              mt="xs"
            >
              <Text size="xs">
                Note: The Sentry API token must be configured in the backend environment. See the documentation for details.
              </Text>
            </Alert>
          </Stack>
        )}
        
        {activeTab === 'ai' && (
          <ModelSelector />
        )}
      </Collapse>
    </Paper>
  );
}

export default SettingsInput;