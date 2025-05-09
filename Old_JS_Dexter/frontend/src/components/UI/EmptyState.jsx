// File: frontend/src/components/UI/EmptyState.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Stack, Text, Title, Button, Center } from '@mantine/core';

/**
 * EmptyState component for displaying when data is not available
 * Provides a consistent, visually appealing empty state with optional action button
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.icon - Icon to display (required)
 * @param {string} props.title - Title text (required)  
 * @param {string} props.message - Descriptive message (required)
 * @param {string} props.buttonLabel - Optional button label
 * @param {Function} props.buttonAction - Optional button action function
 * @param {string} props.size - Size variant (default: 'md')
 */
function EmptyState({ 
  icon, 
  title, 
  message, 
  buttonLabel, 
  buttonAction,
  size = 'md',
  ...otherProps
}) {
  // Size variants for responsive design
  const sizeStyles = {
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
  const sizedIcon = React.cloneElement(icon, { 
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
          
          <Title order={parseInt(titleSize.substring(1))} ta="center">
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

EmptyState.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  buttonLabel: PropTypes.string,
  buttonAction: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default EmptyState;