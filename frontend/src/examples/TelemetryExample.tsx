import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
  Alert,
  Accordion,
  Code,
  Divider,
  Switch
} from '@mantine/core';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import useTelemetry from '../hooks/useTelemetry';
import useAuditLog from '../hooks/useAuditLog';
import telemetry from '../services/telemetry';
import { TelemetryDashboard } from '../components/Monitoring';

/**
 * Example component demonstrating telemetry integration
 */
const TelemetryExample: React.FC = () => {
  const theme = useMantineTheme();
  const [value, setValue] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Initialize telemetry with component name
  const {
    trackClick,
    trackInputChange,
    trackError,
    trackPerformance,
    measure,
    startMeasurement
  } = useTelemetry('TelemetryExample');
  
  // Initialize audit log
  const logEvent = useAuditLog('TelemetryExample', {
    userId: 'example-user-123',
    category: 'demo',
    enableTelemetry: true
  });
  
  // Toggle telemetry on/off
  const handleToggleTelemetry = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (enabled) {
      telemetry.enable();
      logEvent('Telemetry enabled');
    } else {
      telemetry.disable();
      logEvent('Telemetry disabled');
    }
  }, [logEvent]);
  
  // Track input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setValue(newValue);
    
    // Track input change in telemetry
    trackInputChange('demo-input', { length: newValue.length });
    
    // Log to audit log
    logEvent('Input changed', { length: newValue.length });
  }, [trackInputChange, logEvent]);
  
  // Example of tracking a successful operation
  const handleSuccess = useCallback(() => {
    // Start measuring the operation
    const stopMeasure = startMeasurement('success-operation');
    
    // Track the button click
    trackClick('success-button');
    
    // Log to audit log
    logEvent('Success button clicked');
    
    // Simulate some work
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setError(null);
      
      // Stop measuring and record the duration
      stopMeasure();
      
      // Log success to audit log
      logEvent('Operation completed successfully');
    }, 1000);
  }, [trackClick, startMeasurement, logEvent]);
  
  // Example of tracking an error
  const handleError = useCallback(() => {
    // Track the button click
    trackClick('error-button');
    
    // Log to audit log
    logEvent('Error button clicked');
    
    // Simulate an error
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      const errorMessage = 'This is a simulated error for demonstration';
      setError(errorMessage);
      
      // Track the error in telemetry
      trackError(errorMessage, 'rendering', 'error', {
        component: 'TelemetryExample',
        recoverable: true
      });
      
      // Log error to audit log
      logEvent('Operation failed', { error: errorMessage });
    }, 1000);
  }, [trackClick, trackError, logEvent]);
  
  // Example of measuring a heavy operation
  const handleHeavyOperation = useCallback(() => {
    // Track the button click
    trackClick('heavy-operation-button');
    
    // Log to audit log
    logEvent('Heavy operation started');
    
    // Use the measure function to time the operation
    measure('heavy-operation', () => {
      // Simulate heavy computation
      let result = 0;
      for (let i = 0; i < 10000000; i++) {
        result += Math.sqrt(i);
      }
      
      // Record a custom performance metric
      trackPerformance('computation-result', result, 'custom_measurement', 'count');
      
      // Log completion to audit log
      logEvent('Heavy operation completed', { result });
      
      return result;
    });
  }, [measure, trackClick, trackPerformance, logEvent]);
  
  // Toggle dashboard visibility
  const handleToggleDashboard = useCallback(() => {
    setShowDashboard(prev => !prev);
    trackClick('toggle-dashboard');
    logEvent('Dashboard visibility toggled');
  }, [trackClick, logEvent]);
  
  // Load initial data
  useEffect(() => {
    // Start measuring page load time
    const stopMeasure = startMeasurement('component-load');
    
    // Simulate data loading
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setLoading(false);
        
        // Log successful data load
        logEvent('Initial data loaded');
      } catch (error) {
        setLoading(false);
        setError('Failed to load initial data');
        
        // Track error
        if (error instanceof Error) {
          trackError(error.message, 'api', 'error');
        }
        
        // Log error
        logEvent('Failed to load initial data', { error });
      } finally {
        // Stop measuring and record the duration
        stopMeasure();
      }
    };
    
    loadData();
  }, [startMeasurement, trackError, logEvent]);
  
  return (
    <Stack spacing="md">
      <Paper p="md" withBorder>
        <Group position="apart" mb="md">
          <Title order={3}>Telemetry Integration Example</Title>
          <Switch 
            label="Enable Telemetry" 
            checked={isEnabled}
            onChange={(event) => handleToggleTelemetry(event.currentTarget.checked)}
          />
        </Group>
        
        <Text mb="md">
          This component demonstrates how to use the telemetry service to track user interactions,
          performance metrics, and errors in a React application.
        </Text>
        
        <Divider mb="md" />
        
        <Group mb="md">
          <TextInput
            placeholder="Enter some text..."
            value={value}
            onChange={handleInputChange}
            style={{ flex: 1 }}
            disabled={loading}
          />
        </Group>
        
        <Group mb="md">
          <Button onClick={handleSuccess} loading={loading} color="green">
            Trigger Success
          </Button>
          <Button onClick={handleError} loading={loading} color="red">
            Trigger Error
          </Button>
          <Button onClick={handleHeavyOperation} loading={loading} color="blue">
            Heavy Operation
          </Button>
          <Button onClick={handleToggleDashboard} variant="outline">
            {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
          </Button>
        </Group>
        
        {error && (
          <Alert 
            icon={<IconAlertCircle size={16} />} 
            title="An error occurred!" 
            color="red"
            mb="md"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          Interactions with this component are being tracked. Check the browser console
          and the telemetry dashboard to see the collected data.
        </Alert>
      </Paper>
      
      <Accordion>
        <Accordion.Item value="code-examples">
          <Accordion.Control>Code Examples</Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Box>
                <Text fw={500} mb="xs">Initialization:</Text>
                <Code block>
{`// Initialize telemetry with component name
const {
  trackClick,
  trackInputChange,
  trackError,
  trackPerformance,
  measure,
  startMeasurement
} = useTelemetry('TelemetryExample');

// Initialize audit log
const logEvent = useAuditLog('TelemetryExample', {
  userId: 'example-user-123',
  category: 'demo',
  enableTelemetry: true
});`}
                </Code>
              </Box>
              
              <Box>
                <Text fw={500} mb="xs">Tracking User Interactions:</Text>
                <Code block>
{`// Track button click
trackClick('success-button');

// Track input change
trackInputChange('demo-input', { length: value.length });

// Log to audit log
logEvent('Input changed', { length: value.length });`}
                </Code>
              </Box>
              
              <Box>
                <Text fw={500} mb="xs">Measuring Performance:</Text>
                <Code block>
{`// Option 1: Wrap a function with measurement
measure('heavy-operation', () => {
  // Expensive operation...
  return result;
});

// Option 2: Start and stop measurement
const stopMeasure = startMeasurement('component-load');
// Do something...
stopMeasure(); // Records the duration`}
                </Code>
              </Box>
              
              <Box>
                <Text fw={500} mb="xs">Tracking Errors:</Text>
                <Code block>
{`// Track an error
trackError(
  'Error message', 
  'error-category',
  'error', // severity
  { additionalDetails: 'value' }
);`}
                </Code>
              </Box>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      
      {showDashboard && (
        <Box mt="md">
          <TelemetryDashboard />
        </Box>
      )}
    </Stack>
  );
};

export default TelemetryExample;