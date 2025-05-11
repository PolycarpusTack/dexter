import React, { useState, useEffect } from 'react';
import { Button, Stack, Text, Progress, Paper, Center } from '@mantine/core';
import { IconRefresh, IconAlertTriangle } from '@tabler/icons-react';
import { handleApiError, apiErrorHandler } from '../../utils/apiErrorHandler';

interface ErrorRecoveryProps {
  error: Error;
  onRecover?: () => void;
  maxAttempts?: number;
  backoffMs?: number;
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRecover,
  maxAttempts = 3,
  backoffMs = 1000
}) => {
  const [attempts, setAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);

  useEffect(() => {
    // Attempt automatic recovery for certain error types
    const category = apiErrorHandler.categorizeError(error);
    if (category === 'network' && navigator.onLine) {
      attemptRecovery();
    }
  }, [error]);

  const attemptRecovery = async () => {
    if (attempts >= maxAttempts) {
      return;
    }

    setIsRecovering(true);
    setAttempts(prev => prev + 1);
    
    // Exponential backoff
    const delay = backoffMs * Math.pow(2, attempts);
    setRecoveryProgress(0);
    
    // Animate progress
    const progressInterval = setInterval(() => {
      setRecoveryProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + (100 / (delay / 100));
      });
    }, 100);

    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Attempt recovery through error handler
      const recovered = await apiErrorHandler.attemptRecovery(error);
      
      if (recovered && onRecover) {
        setRecoveryProgress(100);
        setTimeout(() => {
          onRecover();
        }, 500);
      } else {
        throw new Error('Recovery failed');
      }
    } catch (e) {
      clearInterval(progressInterval);
      setIsRecovering(false);
      setRecoveryProgress(0);
      
      if (attempts >= maxAttempts - 1) {
        handleApiError(error, {
          userMessage: 'Unable to recover automatically. Please try again manually.',
          silent: false
        });
      }
    }
  };

  const handleManualRetry = () => {
    setAttempts(0);
    attemptRecovery();
  };

  return (
    <Paper p="md" withBorder>
      <Stack align="center" gap="md">
        <IconAlertTriangle size={48} color="orange" />
        
        <Text fw={500} size="lg" ta="center">
          Recovery in Progress
        </Text>
        
        <Text size="sm" c="dimmed" ta="center">
          Attempting to recover from the error...
        </Text>
        
        {isRecovering && (
          <Stack gap="xs" w="100%">
            <Progress value={recoveryProgress} animated />
            <Text size="xs" c="dimmed" ta="center">
              Attempt {attempts} of {maxAttempts}
            </Text>
          </Stack>
        )}
        
        {!isRecovering && attempts < maxAttempts && (
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleManualRetry}
            variant="light"
          >
            Retry Recovery
          </Button>
        )}
        
        {attempts >= maxAttempts && (
          <Stack align="center">
            <Text c="red" size="sm">
              Automatic recovery failed after {maxAttempts} attempts
            </Text>
            <Center>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </Center>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

// Hook for error recovery
export const useErrorRecovery = (error: Error | null) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (error && !isRecovering && !recovered) {
      recoverFromError();
    }
  }, [error]);

  const recoverFromError = async () => {
    if (!error || isRecovering || recovered) return;

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);

    try {
      const success = await apiErrorHandler.attemptRecovery(error);
      if (success) {
        setRecovered(true);
      }
    } finally {
      setIsRecovering(false);
    }
  };

  const reset = () => {
    setRecoveryAttempts(0);
    setRecovered(false);
    setIsRecovering(false);
  };

  return {
    isRecovering,
    recoveryAttempts,
    recovered,
    recoverFromError,
    reset
  };
};
