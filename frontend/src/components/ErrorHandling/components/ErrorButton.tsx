// File: frontend/src/components/ErrorHandling/components/ErrorButton.tsx

import React from 'react';
import { Button, ButtonProps } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

interface ErrorButtonProps extends Omit<ButtonProps, 'children'> {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
}

/**
 * Reusable error retry button component
 * Used across different error fallback UIs for consistency
 */
export const ErrorButton: React.FC<ErrorButtonProps> = ({ 
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
