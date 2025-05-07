// File: frontend/src/components/UI/ProgressIndicator.jsx

import React, { useState, useEffect } from 'react';
import { Progress, Text, Paper, Group, Box } from '@mantine/core';

/**
 * A component that simulates progress for operations with unknown actual progress
 * Particularly useful for long-running AI operations
 */
function ProgressIndicator({ 
  isLoading, 
  operation = 'loading', 
  expectedDuration = 60,  // Expected duration in seconds
  model = null,  // Optional model name to adjust expectations
}) {
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState(null);
  
  // Get model-specific expected duration
  const getModelDuration = (modelName) => {
    if (!modelName) return expectedDuration;
    
    // Rough estimates for various models
    const durations = {
      'mistral': 15,
      'phi3': 20,
      'gemma': 30,
      'llama3': 45,
      'codellama': 90,
      'mixtral': 180,
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
  const formatElapsedTime = () => {
    if (!startTime) return "0s";
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  // Status message varies by progress level
  const getStatusMessage = () => {
    if (progress < 30) return "Starting up...";
    if (progress < 60) return "Processing...";
    if (progress < 90) return "Generating text...";
    return "Almost done...";
  };
  
  return (
    <Paper p="xs" withBorder>
      <Box mb={4}>
        <Progress
          value={progress}
          size="sm"
          radius="xl"
          animate={isLoading}
          color={progress >= 95 ? "green" : "blue"}
        />
      </Box>
      <Group position="apart">
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