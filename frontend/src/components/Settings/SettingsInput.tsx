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

// Import the new API client
import { 
  hooks,
  utils
} from '../../api/unified';

// Destructure the hooks for better readability
const { useCheckConfig } = hooks;

// Define window interface to add our custom global function
declare global {
  interface Window {
    openSentrySettings?: () => void;
  }
}

// Import types from unified API client
import { Config, ConfigParams } from '../../api/unified';

interface FormErrors {
  organization_slug: string | null;
  project_slug: string | null;
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
  const [formErrors, setFormErrors] = useState<FormErrors>({
    organization_slug: null,
    project_slug: null
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({
    organization_slug: false,
    project_slug: false
  });
  
  // Define validation rules for our form fields
  const validationRules = {
    organization_slug: [
      required('Organization slug is required'),
      slug('Organization slug must contain only lowercase letters, numbers, and hyphens'),
      minLength(2, 'Organization slug must be at least 2 characters'),
      maxLength(64, 'Organization slug cannot exceed 64 characters')
    ],
    project_slug: [
      required('Project slug is required'),
      slug('Project slug must contain only lowercase letters, numbers, and hyphens'),
      minLength(2, 'Project slug must be at least 2 characters'),
      maxLength(64, 'Project slug cannot exceed 64 characters')
    ]
  };
  
  // Validate a specific field and update errors
  const validateField = useCallback((field: keyof FormErrors, value: string) => {
    const fieldRules = validationRules[field];
    if (fieldRules) {
      for (const rule of fieldRules) {
        if (!rule.test(value)) {
          setFormErrors(prev => ({ ...prev, [field]: rule.message }));
          return false;
        }
      }
      setFormErrors(prev => ({ ...prev, [field]: null }));
      return true;
    }
    return true;
  }, [validationRules]);
  
  // Update organization slug with validation
  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setOrgInput(newValue);
    if (touched.organization_slug) {
      validateField('organization_slug', newValue);
    }
  };
  
  // Update project slug with validation
  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setProjectInput(newValue);
    if (touched.project_slug) {
      validateField('project_slug', newValue);
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
  
  // Validate entire form
  const validateAllFields = () => {
    const formValues = {
      organization_slug: orgInput,
      project_slug: projectInput
    };
    
    const result = validateForm(formValues, validationRules);
    setFormErrors(result.errors);
    
    // Mark all fields as touched
    setTouched({
      organization_slug: true,
      project_slug: true
    });
    
    return result.isValid;
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
        hooks.utils.showSuccessNotification({
          title: 'Configuration Saved',
          message: `Connected to Sentry project: ${projectInput}`,
        });
      } else {
        utils.showErrorNotification({
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
      
      utils.showErrorNotification({
        title: 'Configuration Error',
        error,
      });
    }
  }, [configMutation.isSuccess, configMutation.isError, configMutation.data, configMutation.error]);
  
  // Handler for saving configuration
  const handleSave = async (): Promise<void> => {
    // First validate all fields
    if (!validateAllFields()) {
      utils.showErrorNotification({
        title: 'Validation Error',
        error: new Error('Please correct the validation errors'),
      });
      return;
    }
    
    // Call the mutation to check configuration
    configMutation.mutate({
      organization_slug: orgInput.trim(),
      project_slug: projectInput.trim(),
    } as ConfigParams);
  };
  
  // Reset form and errors
  const handleReset = () => {
    setOrgInput(organizationSlug || '');
    setProjectInput(projectSlug || '');
    setFormErrors({
      organization_slug: null,
      project_slug: null
    });
    setTouched({
      organization_slug: false,
      project_slug: false
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
  
  // Compute whether form is valid
  const isFormValid = !formErrors.organization_slug && !formErrors.project_slug && 
                      orgInput.trim() !== '' && projectInput.trim() !== '';
  
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
                sx={{ '&:focus': { outline: 'none' } }} // Fix for button focus styles
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
            
            {/* Form validation message */}
            {(!isFormValid && (touched.organization_slug || touched.project_slug)) && (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={16} />}
                title="Please fix the following errors:"
                mb="xs"
              >
                <Stack gap="xs">
                  {formErrors.organization_slug && (
                    <Text size="xs">• {formErrors.organization_slug}</Text>
                  )}
                  {formErrors.project_slug && (
                    <Text size="xs">• {formErrors.project_slug}</Text>
                  )}
                </Stack>
              </Alert>
            )}
            
            {/* Form fields with enhanced validation */}
            <TextInput
              label="Organization Slug"
              placeholder="e.g., acme-corp"
              value={orgInput}
              onChange={handleOrgChange}
              onBlur={() => handleBlur('organization_slug')}
              required
              leftSection={<IconDatabase size={16} />}
              description="The slug of your Sentry organization (lowercase letters, numbers, and hyphens)"
              aria-label="Sentry organization slug"
              error={touched.organization_slug ? formErrors.organization_slug : null}
              withAsterisk
            />
            
            <TextInput
              label="Project Slug"
              placeholder="e.g., frontend"
              value={projectInput}
              onChange={handleProjectChange}
              onBlur={() => handleBlur('project_slug')}
              required
              leftSection={<IconDatabase size={16} />}
              description="The slug of your Sentry project (lowercase letters, numbers, and hyphens)"
              aria-label="Sentry project slug"
              error={touched.project_slug ? formErrors.project_slug : null}
              withAsterisk
            />
            
            <Group justify="flex-end" mt="md">
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleReset}
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
                disabled={!isFormValid}
                color={isFormValid ? 'blue' : 'gray'}
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