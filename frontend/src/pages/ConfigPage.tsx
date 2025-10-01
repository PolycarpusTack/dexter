import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Stack, 
  TextInput, 
  Title, 
  Button, 
  Alert, 
  Space,
  Group,
  Badge,
  ThemeIcon,
  Tabs,
  Divider,
  Text
} from '@mantine/core';
import { 
  IconSettings, 
  IconBrandSentry, 
  IconBrain, 
  IconDatabase,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconRefresh
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore, useAIStore } from '../store';
import ApiConnectionStatus from '../components/ApiConnectionStatus';
import { ModelSelector } from '../components/ModelSelector';
import InfoTooltip from '../components/UI/InfoTooltip';
import { 
  validateForm, 
  required,
  slug,
  minLength,
  maxLength
} from '../utils/formValidation';
import { hooks } from '../api/unified';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling/notifications';
import { useAutoSave, useUnsavedChangesWarning } from '../hooks/useAutoSave';
import { notifications } from '@mantine/notifications';
import { createElement } from 'react';

const { useCheckConfig } = hooks;

// Type definitions
interface FormErrors {
  organization_slug?: string;
  project_slug?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
  connection?: {
    status: 'connected' | 'disconnected' | 'error';
    lastChecked: Date;
  };
}

export default function ConfigPage() {
  const { 
    organizationSlug, 
    projectSlug, 
    setOrgProject,
    apiToken,
    setApiToken
  } = useAuthStore((state) => ({
    organizationSlug: state.organizationSlug,
    projectSlug: state.projectSlug,
    setOrgProject: state.setOrgProject,
    apiToken: state.apiToken,
    setApiToken: state.setApiToken
  }));
  
  // Local form state
  const [orgInput, setOrgInput] = useState(organizationSlug || '');
  const [projectInput, setProjectInput] = useState(projectSlug || '');
  const [tempApiToken, setTempApiToken] = useState(apiToken || '');
  const [saved, setSaved] = useState(false);
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  
  // Auto-save configuration
  const { 
    save: saveConfig, 
    restore, 
    hasUnsavedChanges,
    lastSaved 
  } = useAutoSave({
    key: 'config_page_form',
    data: { orgInput, projectInput, tempApiToken },
    debounceMs: 3000, // 3 seconds for config changes
    enabled: true,
    showNotifications: false,
    onRestore: (data) => {
      setOrgInput(data.orgInput || '');
      setProjectInput(data.projectInput || '');
      setTempApiToken(data.tempApiToken || '');
      notifications.show({
        title: 'Configuration Restored',
        message: 'Your unsaved configuration has been restored',
        color: 'blue',
        icon: createElement(IconRefresh, { size: 16 })
      });
    }
  });
  
  // Warn about unsaved changes
  useUnsavedChangesWarning(hasUnsavedChanges && !saved);
  
  // Restore saved data on mount
  useEffect(() => {
    restore();
  }, []);
  
  // Update local state when global state changes
  useEffect(() => {
    if (organizationSlug) setOrgInput(organizationSlug);
    if (projectSlug) setProjectInput(projectSlug);
  }, [organizationSlug, projectSlug]);

  // Validation rules
  const validationRules = {
    organization_slug: [
      required('Organization slug is required'),
      slug('Organization slug must be a valid slug (letters, numbers, hyphens)'),
      minLength(3, 'Organization slug must be at least 3 characters'),
      maxLength(100, 'Organization slug must be at most 100 characters')
    ],
    project_slug: [
      required('Project slug is required'),
      slug('Project slug must be a valid slug (letters, numbers, hyphens)'),
      minLength(3, 'Project slug must be at least 3 characters'),
      maxLength(100, 'Project slug must be at most 100 characters')
    ]
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
    if (field === 'organization_slug') {
      setOrgInput(value);
    } else if (field === 'project_slug') {
      setProjectInput(value);
    }
    
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
    const result = validateForm(
      {
        organization_slug: orgInput,
        project_slug: projectInput
      },
      validationRules
    );
    
    setFormErrors(result.errors);
    setTouched({
      organization_slug: true,
      project_slug: true
    });
    
    return result.isValid;
  };
  
  // Use the mutation hook from the unified API
  const configMutation = useCheckConfig();
  
  // Handle success and error cases
  useEffect(() => {
    if (configMutation.isSuccess && configMutation.data) {
      const data = configMutation.data;
      if (data && data.organization_slug && data.project_slug) {
        setOrgProject(orgInput, projectInput);
        if (tempApiToken) {
          setApiToken(tempApiToken);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        
        // Clear auto-save after successful save
        saveConfig();
        
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
    
    if (configMutation.isError && configMutation.error) {
      const error = configMutation.error as Error;
      
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
    if (!validateAllFields()) {
      showErrorNotification({
        title: 'Validation Error',
        error: new Error('Please correct the validation errors'),
      });
      return;
    }
    
    configMutation.mutate({
      organization_slug: orgInput,
      project_slug: projectInput
    });
  };
  
  // Handler for testing connection
  const handleTestConnection = async (): Promise<void> => {
    if (!validateAllFields()) {
      showErrorNotification({
        title: 'Validation Error',
        error: new Error('Please correct the validation errors'),
      });
      return;
    }
    
    configMutation.mutate({
      organization_slug: orgInput,
      project_slug: projectInput
    });
  };

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Paper p="lg" shadow="xs">
          <Group justify="space-between" align="center" mb="lg">
            <Title order={2}>
              <Group gap="sm">
                <ThemeIcon color="blue" variant="light" size="lg">
                  <IconSettings size={24} />
                </ThemeIcon>
                <Text>Application Configuration</Text>
              </Group>
            </Title>
            {organizationSlug && projectSlug && (
              <Badge 
                color="green" 
                variant="light" 
                size="md" 
                leftSection={<IconCheck size={16} />}
              >
                Connected
              </Badge>
            )}
          </Group>
          
          {saved && (
            <Alert color="green" mb="md" icon={<IconCheck size={16} />}>
              Configuration saved successfully!
            </Alert>
          )}
          
          {hasUnsavedChanges && !saved && (
            <Group justify="space-between" mb="md">
              <Badge color="yellow" variant="dot" size="sm">
                Unsaved changes (auto-save enabled)
              </Badge>
              {lastSaved && (
                <Text size="xs" c="dimmed">
                  Last saved: {new Date(lastSaved).toLocaleTimeString()}
                </Text>
              )}
            </Group>
          )}
          
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

            <Tabs.Panel value="sentry" pt="lg">
              <Stack gap="md">
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
                
                <TextInput
                  label="API Token (Optional)"
                  value={tempApiToken}
                  onChange={(e) => setTempApiToken(e.currentTarget.value)}
                  placeholder="Enter your Sentry API token"
                  description="Your Sentry API token for authentication (optional for public projects)"
                  type="password"
                  rightSection={
                    <InfoTooltip info="API token is optional but recommended for accessing private data and higher rate limits." />
                  }
                />
                
                <Group justify="space-between" mt="lg">
                  <Button 
                    variant="light" 
                    size="sm" 
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleTestConnection}
                    loading={configMutation.isLoading}
                    disabled={configMutation.isLoading}
                  >
                    Test Connection
                  </Button>
                  
                  <Button 
                    onClick={handleSave}
                    leftSection={<IconCheck size={16} />}
                    loading={configMutation.isLoading}
                    disabled={configMutation.isLoading}
                  >
                    Save Configuration
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="ai" pt="lg">
              <Stack gap="md">
                <Title order={4}>AI Model Configuration</Title>
                <Text size="sm" c="dimmed">
                  Select and configure AI models for error analysis
                </Text>
                
                <Divider my="sm" />
                
                <ModelSelector />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="database" pt="lg">
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
        
        <ApiConnectionStatus />
      </Stack>
    </Container>
  );
}