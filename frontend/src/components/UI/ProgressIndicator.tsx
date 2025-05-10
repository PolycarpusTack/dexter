// File: frontend/src/components/UI/ProgressIndicator.tsx

import { useState, useEffect } from 'react';
import { Progress, Text, Paper, Group, Box } from '@mantine/core';

interface ProgressIndicatorProps {
  isLoading: boolean;
  operation?: string;
  expectedDuration?: number;  // Expected duration in seconds
  model?: string | null;  // Optional model name to adjust expectations
}

/**
 * A component that simulates progress for operations with unknown actual progress
 * Particularly useful for long-running AI operations
 */
function ProgressIndicator({ 
  isLoading, 
  operation = 'loading', // This is used in the progress description
  expectedDuration = 120,  // Expected duration in seconds (default 2 minutes)
  model = null,  // Optional model name to adjust expectations
}: ProgressIndicatorProps): JSX.Element | null {
  const [progress, setProgress] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Get model-specific expected duration
  const getModelDuration = (modelName: string): number => {
    if (!modelName) return expectedDuration;
    
    // Rough estimates for various models (in seconds)
    const durations: Record<string, number> = {
      'mistral': 60,    // 1 minute
      'phi3': 120,      // 2 minutes
      'gemma': 180,     // 3 minutes
      'llama3': 300,    // 5 minutes
      'codellama': 480, // 8 minutes
      'mixtral': 900,   // 15 minutes
    };
    
    // Check for exact match or substring match
    for (const [key, duration] of Object.entries(durations)) {
      if (modelName.includes(key)) {
        return duration;
      }
    }
    
    return expectedDuration;
  };
  
  // Calculate adjusted expected duration based on model
  const adjustedDuration = model ? getModelDuration(model) : expectedDuration;
  
  // Progress simulation - will increment faster at first and slow down near 90%
  useEffect(() => {
    if (isLoading) {
      // Reset and start timing when loading begins
      setProgress(0);
      setStartTime(Date.now());
      
      // Gradually increase progress based on time passed and expected duration
      const interval = setInterval(() => {
        if (startTime === null) return;
        
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const progressPercent = Math.min(99, (elapsed / adjustedDuration) * 100);
        
        // Apply easing function - faster at first, then slower as it approaches 90%
        let adjustedProgress;
        if (progressPercent < 80) {
          adjustedProgress = progressPercent; // Linear until 80%
        } else {
          // Logarithmic slow down as we approach 90%
          adjustedProgress = 80 + (Math.log10((progressPercent - 80) + 1) * 10);
        }
        
        setProgress(adjustedProgress);
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      // When loading finishes, quickly complete to 100%
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 1000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, adjustedDuration, startTime]);
  
  // Don't render when not loading and progress is 0
  if (!isLoading && progress === 0) return null;
  
  // Format elapsed time
  const formatElapsedTime = (): string => {
    if (!startTime) return "0s";
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  // Status message varies by progress level and operation
  const getStatusMessage = (): string => {
    const prefix = operation ? `${operation} ` : '';
    if (progress < 30) return `${prefix} Starting up...`;
    if (progress < 60) return `${prefix} Processing...`;
    if (progress < 90) return `${prefix} Generating text...`;
    return `${prefix} Almost done...`;
  };
  
  return (
    <Paper p="xs" withBorder>
      <Box mb={4}>
        <Progress
          value={progress}
          size="sm"
          radius="xl"
          animated={isLoading}
          color={progress >= 95 ? "green" : "blue"}
        />
      </Box>
      <Group justify="apart">
        <Text size="xs" color="dimmed">
          {getStatusMessage()}
        </Text>
        <Text size="xs" color="dimmed">
          {formatElapsedTime()}
        </Text>
      </Group>
    </Paper>
  );
}

export default ProgressIndicator;