// File: frontend/src/components/Settings/SettingsInput.tsx

import { useState, useEffect } from 'react';
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
  Badge,
  useMantineTheme,
  Tabs,
  Tooltip,
  Title
} from '@mantine/core';
import { 
  IconSettings, 
  IconBrandSentry, 
  IconDatabase, 
  IconInfoCircle,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconBrain,
  IconCheck
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import useAppStore from '../../store/appStore';
import { checkConfig } from '../../api/configApi';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';
import InfoTooltip from '../UI/InfoTooltip';
import AccessibleIcon from '../UI/AccessibleIcon';
import ModelSelector from '../ModelSelector/ModelSelector';

// Define window interface to add our custom global function
declare global {
  interface Window {
    openSentrySettings?: () => void;
  }
}

interface ConfigResponse {
  organization_slug: string;
  project_slug: string;
  [key: string]: any;
}

interface ConfigPayload {
  organization_slug: string;
  project_slug: string;
}

/**
 * SettingsInput component for configuring Sentry organization and project
 */
function SettingsInput(): JSX.Element {
  // Use state instead of useDisclosure
  const [opened, setOpened] = useState<boolean>(false);
  const toggle = (): void => setOpened((prev) => !prev);
  
  // Expose a function for external components to open the settings
  // This will be called via the DOM
  useEffect(() => {
    window.openSentrySettings = () => setOpened(true);
    return () => { 
      delete window.openSentrySettings; 
    };
  }, []);
  
  const theme = useMantineTheme();
  
  // Get state from global store
  const { organizationSlug, projectSlug, setOrgProject } = useAppStore(
    (state) => ({
      organizationSlug: state.organizationSlug,
      projectSlug: state.projectSlug,
      setOrgProject: state.setOrgProject,
    })
  );
  
  // Local form state
  const [orgInput, setOrgInput] = useState<string>(organizationSlug || '');
  const [projectInput, setProjectInput] = useState<string>(projectSlug || '');
  const [activeTab, setActiveTab] = useState<string>('sentry');
  
  // Mutation for checking configuration
  const configMutation = useMutation<ConfigResponse, Error, ConfigPayload>({
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
          error: new Error('Invalid response from server'),
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
  const handleSave = async (): Promise<void> => {
    if (!orgInput.trim() || !projectInput.trim()) {
      showErrorNotification({
        title: 'Validation Error',
        error: new Error('Organization slug and project slug are required'),
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
  const ConfigStatusBadge = (): JSX.Element => {
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
      style={{
        backgroundColor: organizationSlug && projectSlug 
          ? theme.colors.green[0] 
          : theme.colors.yellow[0],
        opacity: 0.8,
        borderColor: organizationSlug && projectSlug 
          ? theme.colors.green[3]
          : theme.colors.yellow[3],
      }}
    >
      {/* Header */}
      <Group justify="apart" mb="xs">
        <Group gap="xs">
          <ThemeIcon
            size="md"
            radius="md"
            color={organizationSlug && projectSlug ? 'green' : 'yellow'}
          >
            <IconSettings size={16} />
          </ThemeIcon>
          <Title order={5}>Configuration</Title>
        </Group>
        
        <Group gap="xs">
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
        <Group gap="xs">
          <Group gap="xs">
            <AccessibleIcon
              icon={<IconBrandSentry size={10} />}
              label="Connected to Sentry"
            />
            <Text size="sm">
              <Text span fw={500}>{organizationSlug}</Text>
              {' / '}
              <Text span fw={500}>{projectSlug}</Text>
            </Text>
          </Group>
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
          onChange={(value: string | null) => setActiveTab(value || '')}
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
          <Stack gap="xs">
            <Group gap="xs" mb="xs">
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
              onChange={(e) => setOrgInput(e.currentTarget.value)}
              required
              leftSection={<IconDatabase size={16} />}
              description="The slug of your Sentry organization"
              aria-label="Sentry organization slug"
              error={configMutation.isError && configMutation.error?.message?.includes('organization') ? 'Invalid organization' : null}
            />
            
            <TextInput
              label="Project Slug"
              placeholder="e.g., frontend"
              value={projectInput}
              onChange={(e) => setProjectInput(e.currentTarget.value)}
              required
              leftSection={<IconDatabase size={16} />}
              description="The slug of your Sentry project"
              aria-label="Sentry project slug"
              error={configMutation.isError && configMutation.error?.message?.includes('project') ? 'Invalid project' : null}
            />
            
            <Group justify="flex-end" mt="md">
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