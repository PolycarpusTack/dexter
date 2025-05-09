// File: frontend/src/components/UI/EmptyState.tsx

import React, { ReactNode } from 'react';
import { Paper, Stack, Text, Title, Button, Center, PaperProps } from '@mantine/core';

type SizeVariant = 'sm' | 'md' | 'lg';

interface SizeStyles {
  iconSize: number;
  titleSize: string;
  spacing: string;
  py: string;
}

interface EmptyStateProps extends Omit<PaperProps, 'title'> {
  icon: ReactNode;
  title: string;
  message: string;
  buttonLabel?: string;
  buttonAction?: () => void;
  size?: SizeVariant;
}

/**
 * EmptyState component for displaying when data is not available
 * Provides a consistent, visually appealing empty state with optional action button
 */
function EmptyState({ 
  icon, 
  title, 
  message, 
  buttonLabel, 
  buttonAction,
  size = 'md',
  ...otherProps
}: EmptyStateProps): JSX.Element {
  // Size variants for responsive design
  const sizeStyles: Record<SizeVariant, SizeStyles> = {
    sm: {
      iconSize: 32,
      titleSize: 'h4',
      spacing: 'sm',
      py: 'md',
    },
    md: {
      iconSize: 48, 
      titleSize: 'h3',
      spacing: 'md',
      py: 'xl',
    },
    lg: {
      iconSize: 64,
      titleSize: 'h2',
      spacing: 'lg',
      py: '2xl',
    }
  };

  const { iconSize, titleSize, spacing, py } = sizeStyles[size] || sizeStyles.md;
  
  // Clone the icon with the correct size
  const sizedIcon = React.cloneElement(React.Children.only(icon as React.ReactElement), { 
    size: iconSize,
    // Apply a muted color for the icon
    color: 'var(--mantine-color-blue-4)',
    stroke: 1.5,
  });

  return (
    <Paper withBorder p="xl" py={py} {...otherProps} radius="md">
      <Center>
        <Stack align="center" gap={spacing} style={{ maxWidth: 500 }}>
          {sizedIcon}
          
          <Title order={parseInt(titleSize.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6} ta="center">
            {title}
          </Title>
          
          <Text ta="center" size="sm" c="dimmed" mb={spacing}>
            {message}
          </Text>
          
          {buttonLabel && buttonAction && (
            <Button onClick={buttonAction}>
              {buttonLabel}
            </Button>
          )}
        </Stack>
      </Center>
    </Paper>
  );
}

export default EmptyState;