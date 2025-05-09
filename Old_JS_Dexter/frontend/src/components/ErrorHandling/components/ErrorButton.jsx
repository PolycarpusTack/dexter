// File: frontend/src/components/ErrorHandling/components/ErrorButton.jsx

import React from 'react';
import { Button } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

/**
 * Reusable error retry button component
 * Used across different error fallback UIs for consistency
 */
export const ErrorButton = ({ 
  onClick, 
  label = 'Try again',
  icon = <IconRefresh size={16} />,
  variant = 'filled',
  color = 'red',
  size = 'sm',
  ...props 
}) => (
  <Button 
    leftSection={icon}
    onClick={onClick}
    variant={variant}
    color={color}
    size={size}
    {...props}
  >
    {label}
  </Button>
);

export default ErrorButton;
