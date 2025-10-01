import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Text,
  Title,
  Stack,
  Paper,
  ThemeIcon,
  Progress,
  Alert,
  Badge,
  Box,
  ActionIcon,
  Center
} from '@mantine/core';
import {
  IconCheck,
  IconBrandSentry,
  IconRocket,
  IconChartBar,
  IconX,
  IconArrowRight,
  IconArrowLeft
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { ConfigStatusIndicator } from '../ConfigStatusIndicator';

interface OnboardingState {
  currentStep: 'welcome' | 'connect' | 'configure' | 'explore' | 'complete';
  progress: number;
  skipped: boolean;
}

interface OnboardingFlowProps {
  opened: boolean;
  onClose: () => void;
}

const ONBOARDING_STORAGE_KEY = 'dexter_onboarding_state';

export function OnboardingFlow({ opened, onClose }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const { organizationSlug, projectSlug } = useAuthStore();
  
  const [active, setActive] = useState(0);
  const [highestStepVisited, setHighestStepVisited] = useState(0);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    currentStep: 'welcome',
    progress: 0,
    skipped: false
  });

  // Load saved onboarding state
  useEffect(() => {
    const savedState = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setOnboardingState(parsed);
      
      // Resume from saved step
      const stepIndex = getStepIndex(parsed.currentStep);
      setActive(stepIndex);
      setHighestStepVisited(stepIndex);
    }
  }, []);

  // Save onboarding state
  const saveOnboardingState = (state: OnboardingState) => {
    setOnboardingState(state);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  };

  const getStepIndex = (step: OnboardingState['currentStep']): number => {
    const steps: OnboardingState['currentStep'][] = ['welcome', 'connect', 'configure', 'explore', 'complete'];
    return steps.indexOf(step);
  };

  const getStepFromIndex = (index: number): OnboardingState['currentStep'] => {
    const steps: OnboardingState['currentStep'][] = ['welcome', 'connect', 'configure', 'explore', 'complete'];
    return steps[index] || 'welcome';
  };

  const handleStepChange = (nextStep: number) => {
    const isOutOfBounds = nextStep > 4 || nextStep < 0;

    if (isOutOfBounds) {
      return;
    }

    setActive(nextStep);
    setHighestStepVisited((hSV) => Math.max(hSV, nextStep));
    
    const stepName = getStepFromIndex(nextStep);
    saveOnboardingState({
      ...onboardingState,
      currentStep: stepName,
      progress: (nextStep / 4) * 100
    });
  };

  const nextStep = () => handleStepChange(active + 1);
  const prevStep = () => handleStepChange(active - 1);

  const handleSkip = () => {
    saveOnboardingState({
      currentStep: 'complete',
      progress: 100,
      skipped: true
    });
    onClose();
  };

  const handleComplete = () => {
    saveOnboardingState({
      currentStep: 'complete',
      progress: 100,
      skipped: false
    });
    onClose();
  };

  const shouldAllowSelectStep = (step: number) => highestStepVisited >= step;

  // Check if configuration is complete
  const isConfigured = organizationSlug && projectSlug;

  return (
    <Modal
      opened={opened}
      onClose={handleSkip}
      size="lg"
      title={
        <Group justify="space-between" style={{ width: '100%' }}>
          <Title order={3}>Welcome to Dexter</Title>
          <ActionIcon variant="subtle" onClick={handleSkip}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
      }
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack gap="md">
        <Progress value={onboardingState.progress} size="sm" radius="xl" />
        
        <Stepper 
          active={active} 
          onStepClick={(step) => shouldAllowSelectStep(step) && handleStepChange(step)}
          size="sm"
        >
          <Stepper.Step
            label="Welcome"
            description="Get started"
            icon={<IconRocket size={18} />}
          >
            <Stack gap="md" mt="xl">
              <Center>
                <ThemeIcon size={80} radius="xl" variant="light" color="blue">
                  <IconRocket size={40} />
                </ThemeIcon>
              </Center>
              
              <Title order={4} ta="center">Welcome to Dexter!</Title>
              
              <Text ta="center" c="dimmed">
                Dexter is your intelligent companion for Sentry error monitoring. 
                Let's get you set up in just a few steps.
              </Text>
              
              <Stack gap="xs" mt="md">
                <Paper p="sm" withBorder>
                  <Group>
                    <ThemeIcon color="blue" variant="light">
                      <IconBrandSentry size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500}>Connect to Sentry</Text>
                      <Text size="sm" c="dimmed">Link your Sentry organization</Text>
                    </div>
                  </Group>
                </Paper>
                
                <Paper p="sm" withBorder>
                  <Group>
                    <ThemeIcon color="green" variant="light">
                      <IconChartBar size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500}>Analyze Errors</Text>
                      <Text size="sm" c="dimmed">Get AI-powered insights</Text>
                    </div>
                  </Group>
                </Paper>
              </Stack>
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="Connect"
            description="Link Sentry"
            icon={<IconBrandSentry size={18} />}
          >
            <Stack gap="md" mt="xl">
              <Center>
                <ThemeIcon size={80} radius="xl" variant="light" color="indigo">
                  <IconBrandSentry size={40} />
                </ThemeIcon>
              </Center>
              
              <Title order={4} ta="center">Connect to Sentry</Title>
              
              <Text ta="center" c="dimmed">
                To get started, you'll need to connect Dexter to your Sentry organization.
              </Text>
              
              <Alert icon={<IconBrandSentry size={16} />} variant="light" color="blue">
                You'll need:
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  <li>Your Sentry organization slug</li>
                  <li>Your project slug</li>
                  <li>An API token (optional but recommended)</li>
                </ul>
              </Alert>
              
              <Center mt="md">
                <ConfigStatusIndicator showDetails={false} />
              </Center>
              
              {!isConfigured && (
                <Button 
                  onClick={() => navigate('/config')}
                  leftSection={<IconArrowRight size={16} />}
                >
                  Go to Configuration
                </Button>
              )}
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="Configure"
            description="Customize settings"
            icon={<IconCheck size={18} />}
            color={isConfigured ? 'green' : undefined}
          >
            <Stack gap="md" mt="xl">
              <Center>
                <ThemeIcon size={80} radius="xl" variant="light" color="green">
                  <IconCheck size={40} />
                </ThemeIcon>
              </Center>
              
              <Title order={4} ta="center">Configuration Complete!</Title>
              
              {isConfigured ? (
                <>
                  <Text ta="center" c="dimmed">
                    Great! You're connected to Sentry. You can now:
                  </Text>
                  
                  <Stack gap="xs" mt="md">
                    <Paper p="sm" withBorder>
                      <Group>
                        <IconCheck size={20} color="green" />
                        <Text>View and analyze your Sentry issues</Text>
                      </Group>
                    </Paper>
                    
                    <Paper p="sm" withBorder>
                      <Group>
                        <IconCheck size={20} color="green" />
                        <Text>Get AI-powered error explanations</Text>
                      </Group>
                    </Paper>
                    
                    <Paper p="sm" withBorder>
                      <Group>
                        <IconCheck size={20} color="green" />
                        <Text>Set up alert rules and monitoring</Text>
                      </Group>
                    </Paper>
                  </Stack>
                </>
              ) : (
                <>
                  <Alert color="yellow" icon={<IconBrandSentry size={16} />}>
                    Please complete the Sentry configuration before proceeding.
                  </Alert>
                  
                  <Button 
                    onClick={() => navigate('/config')}
                    leftSection={<IconArrowRight size={16} />}
                  >
                    Complete Configuration
                  </Button>
                </>
              )}
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="Explore"
            description="Start using Dexter"
            icon={<IconChartBar size={18} />}
          >
            <Stack gap="md" mt="xl">
              <Center>
                <ThemeIcon size={80} radius="xl" variant="light" color="teal">
                  <IconChartBar size={40} />
                </ThemeIcon>
              </Center>
              
              <Title order={4} ta="center">Ready to Explore!</Title>
              
              <Text ta="center" c="dimmed">
                Here are some things you can do with Dexter:
              </Text>
              
              <Stack gap="xs" mt="md">
                <Button
                  variant="light"
                  leftSection={<IconChartBar size={16} />}
                  onClick={() => {
                    handleComplete();
                    navigate('/');
                  }}
                >
                  View Dashboard
                </Button>
                
                <Button
                  variant="light"
                  leftSection={<IconBrandSentry size={16} />}
                  onClick={() => {
                    handleComplete();
                    navigate('/issues');
                  }}
                >
                  Browse Issues
                </Button>
                
                <Button
                  variant="light"
                  leftSection={<IconRocket size={16} />}
                  onClick={() => {
                    handleComplete();
                    navigate('/events');
                  }}
                >
                  Explore Events
                </Button>
              </Stack>
              
              <Text size="sm" c="dimmed" ta="center" mt="md">
                You can always access help from the settings menu.
              </Text>
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack gap="md" mt="xl" align="center">
              <ThemeIcon size={80} radius="xl" variant="filled" color="green">
                <IconCheck size={40} />
              </ThemeIcon>
              
              <Title order={4}>All Set!</Title>
              
              <Text ta="center" c="dimmed">
                You've completed the onboarding. Happy monitoring!
              </Text>
              
              <Button onClick={handleComplete} size="lg">
                Start Using Dexter
              </Button>
            </Stack>
          </Stepper.Completed>
        </Stepper>

        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            onClick={prevStep}
            disabled={active === 0}
            leftSection={<IconArrowLeft size={16} />}
          >
            Back
          </Button>
          
          <Group>
            <Button
              variant="subtle"
              onClick={handleSkip}
            >
              Skip Tour
            </Button>
            
            {active < 4 && (
              <Button
                onClick={nextStep}
                rightSection={<IconArrowRight size={16} />}
              >
                Next
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

export default OnboardingFlow;