// File: frontend/src/components/Settings/SettingsInput.tsx

import { useState, useEffect, useCallback } from 'react';
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
  IconCheck,
  IconAlertCircle
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import useAppStore from '../../store/appStore';
import InfoTooltip from '../UI/InfoTooltip';
import AccessibleIcon from '../UI/AccessibleIcon';
import ModelSelector from '../ModelSelector/ModelSelector';
import { 
  validateForm, 
  required,
  slug,
  minLength,
  maxLength
} from '../../utils/formValidation';

// Import API hooks
import { hooks } from '../../api/unified';

// Import notification functions directly
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling/notifications';

// Destructure the hooks for better readability
const { useCheckConfig } = hooks;

// Type definitions for form state
interface FormErrors {
  organization_slug?: string;
  project_slug?: string;
}

// Extend Window interface to include openSentrySettings function
declare global {
  interface Window {
    openSentrySettings?: () => void;
  }
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
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  
  // Update local state when global state changes
  useEffect(() => {
    if (organizationSlug) setOrgInput(organizationSlug);
    if (projectSlug) setProjectInput(projectSlug);
  }, [organizationSlug, projectSlug]);
  
  // Validation rules for the config form - ensure we create proper arrays
  const orgSlugRules = [];
  orgSlugRules.push(required('Organization slug is required'));
  orgSlugRules.push(slug('Organization slug must be a valid slug (letters, numbers, hyphens)'));
  orgSlugRules.push(minLength(3, 'Organization slug must be at least 3 characters'));
  orgSlugRules.push(maxLength(100, 'Organization slug must be at most 100 characters'));
  
  const projectSlugRules = [];
  projectSlugRules.push(required('Project slug is required'));
  projectSlugRules.push(slug('Project slug must be a valid slug (letters, numbers, hyphens)'));
  projectSlugRules.push(minLength(3, 'Project slug must be at least 3 characters'));
  projectSlugRules.push(maxLength(100, 'Project slug must be at most 100 characters'));
  
  const validationRules = {
    organization_slug: orgSlugRules,
    project_slug: projectSlugRules
  };
  
  // Validate form field
  const validateField = (field: keyof FormErrors, value: string) => {
    const rules = validationRules[field];
    const fieldResult = validateForm({ [field]: value }, { [field]: rules });
    
    setFormErrors(prev => ({
      ...prev,
      [field]: fieldResult.errors[field]
    }));
    
    return fieldResult.isValid;
  };
  
  // Handler for form field changes
  const handleFieldChange = (field: keyof FormErrors, value: string) => {
    // Update form state
    if (field === 'organization_slug') {
      setOrgInput(value);
    } else if (field === 'project_slug') {
      setProjectInput(value);
    }
    
    // Validate field if it has been touched
    if (touched[field]) {
      validateField(field, value);
    }
  };
  
  // Mark field as touched when blur event occurs
  const handleBlur = (field: keyof FormErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'organization_slug') {
      validateField(field, orgInput);
    } else if (field === 'project_slug') {
      validateField(field, projectInput);
    }
  };
  
  // Validate all fields
  const validateAllFields = (): boolean => {
    try {
      // Debug: Check what's being passed
      console.log('validationRules type:', typeof validationRules);
      console.log('validationRules:', validationRules);
      console.log('orgSlugRules type:', typeof orgSlugRules);
      console.log('orgSlugRules:', orgSlugRules);
      console.log('projectSlugRules type:', typeof projectSlugRules);
      console.log('projectSlugRules:', projectSlugRules);
      
      // Debug the validation function call
      console.log('Calling validateForm with:');
      console.log('values:', {
        organization_slug: orgInput,
        project_slug: projectInput
      });
      console.log('rules:', validationRules);
      
      const result = validateForm(
        {
          organization_slug: orgInput,
          project_slug: projectInput
        },
        validationRules
      );
      
      setFormErrors(result.errors);
      
      // Mark all fields as touched
      setTouched({
        organization_slug: true,
        project_slug: true
      });
      
      return result.isValid;
    } catch (error) {
      console.error('Error in validateAllFields:', error);
      throw error;
    }
  };
  
  // Use the mutation hook from the unified API
  const configMutation = useCheckConfig();
  
  // Hook for handling success and error cases
  useEffect(() => {
    // Handle success
    if (configMutation.isSuccess && configMutation.data) {
      const data = configMutation.data;
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
    }
    
    // Handle error
    if (configMutation.isError && configMutation.error) {
      const error = configMutation.error as Error;
      
      // Check if the error message indicates an invalid org or project
      if (error.message?.toLowerCase().includes('organization')) {
        setFormErrors(prev => ({
          ...prev,
          organization_slug: 'Invalid organization slug'
        }));
      } else if (error.message?.toLowerCase().includes('project')) {
        setFormErrors(prev => ({
          ...prev,
          project_slug: 'Invalid project slug'
        }));
      }
      
      showErrorNotification({
        title: 'Configuration Error',
        error,
      });
    }
  }, [configMutation.isSuccess, configMutation.isError, configMutation.data, configMutation.error]);
  
  // Handler for saving configuration
  const handleSave = async (): Promise<void> => {
    // First validate all fields
    if (!validateAllFields()) {
      showErrorNotification({
        title: 'Validation Error',
        error: new Error('Please correct the validation errors'),
      });
      return;
    }
    
    // Call the mutation to check configuration
    configMutation.mutate({
      organization_slug: orgInput,
      project_slug: projectInput
    });
  };
  
  return (
    <Stack>
      <Tooltip label="Configure Sentry Connection" withinPortal>
        <Paper 
          p="md" 
          radius="md" 
          style={{ 
            border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
            cursor: 'pointer'
          }}
          onClick={toggle}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ThemeIcon color="blue" variant="light" size="md">
                <IconBrandSentry size={18} />
              </ThemeIcon>
              <div>
                <Text fw={500} size="sm">Sentry Connection</Text>
                <Text size="xs" c="dimmed">
                  {organizationSlug && projectSlug 
                    ? `${organizationSlug} / ${projectSlug}` 
                    : 'Not configured'}
                </Text>
              </div>
            </Group>
            <Group gap="xs">
              {organizationSlug && projectSlug && (
                <Badge 
                  color="green" 
                  variant="light" 
                  size="xs" 
                  leftSection={<IconCheck size={14} />}
                >
                  Connected
                </Badge>
              )}
              <AccessibleIcon
                label={opened ? "Collapse settings" : "Expand settings"}
                Icon={opened ? IconChevronUp : IconChevronDown}
                size={18}
                color="dimmed"
              />
            </Group>
          </Group>
        </Paper>
      </Tooltip>

      <Collapse in={opened}>
        <Paper p="md" radius="md" withBorder>
          <Tabs defaultValue="sentry">
            <Tabs.List>
              <Tabs.Tab value="sentry" leftSection={<IconBrandSentry size={16} />}>
                Sentry Connection
              </Tabs.Tab>
              <Tabs.Tab value="ai" leftSection={<IconBrain size={16} />}>
                AI Models
              </Tabs.Tab>
              <Tabs.Tab value="database" leftSection={<IconDatabase size={16} />}>
                Database
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="sentry" pt="md">
              <Stack gap="sm">
                <Alert 
                  icon={<IconInfoCircle size={16} />}
                  variant="light" 
                  color="blue"
                  mb="sm"
                >
                  Enter your Sentry organization and project slugs to connect Dexter to your Sentry data.
                </Alert>
                
                <TextInput
                  label="Organization Slug"
                  placeholder="my-organization"
                  value={orgInput}
                  onChange={(e) => handleFieldChange('organization_slug', e.currentTarget.value)}
                  onBlur={() => handleBlur('organization_slug')}
                  error={touched.organization_slug && formErrors.organization_slug}
                  required
                  rightSection={
                    <InfoTooltip info="The organization slug from your Sentry URL. For example, if your Sentry URL is https://sentry.io/organizations/my-org/issues/, your organization slug is 'my-org'." />
                  }
                />
                
                <TextInput
                  label="Project Slug"
                  placeholder="my-project"
                  value={projectInput}
                  onChange={(e) => handleFieldChange('project_slug', e.currentTarget.value)}
                  onBlur={() => handleBlur('project_slug')}
                  error={touched.project_slug && formErrors.project_slug}
                  required
                  rightSection={
                    <InfoTooltip info="The project slug from your Sentry URL. For example, if your project URL is https://sentry.io/organizations/my-org/projects/my-app/, your project slug is 'my-app'." />
                  }
                />
                
                <Group justify="space-between" mt="md">
                  <Button 
                    variant="light" 
                    size="sm" 
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleSave}
                    loading={configMutation.isPending}
                    disabled={configMutation.isPending}
                  >
                    Test Connection
                  </Button>
                  
                  <Button 
                    onClick={handleSave}
                    leftSection={<IconCheck size={16} />}
                    loading={configMutation.isPending}
                    disabled={configMutation.isPending}
                  >
                    Save Configuration
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="ai" pt="md">
              <Stack gap="md">
                <Title order={5}>AI Model Configuration</Title>
                <Text size="sm" c="dimmed">
                  Select and configure AI models for error analysis
                </Text>
                
                <Divider my="sm" />
                
                <ModelSelector />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="database" pt="md">
              <Alert
                icon={<IconDatabase size={16} />}
                variant="light"
                color="gray"
              >
                Database configuration settings coming soon.
              </Alert>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Collapse>
    </Stack>
  );
}

export default SettingsInput;