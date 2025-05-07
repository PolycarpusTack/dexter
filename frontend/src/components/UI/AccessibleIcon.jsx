// File: frontend/src/components/UI/AccessibleIcon.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@mantine/core';

/**
 * AccessibleIcon component that wraps an icon with an accessible label
 * Improves accessibility by providing screen reader text while keeping the visual experience unchanged
 * 
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.icon - The icon component to render
 * @param {string} props.label - Accessible label for screen readers
 * @param {boolean} props.hideLabel - Whether to visually hide the label (default: true)
 */
const AccessibleIcon = React.forwardRef(({ 
  icon, 
  label, 
  hideLabel = true,
  ...otherProps 
}, ref) => {
  if (!icon) {
    return null;
  }

  // Clone the icon to ensure proper props are passed
  const accessibleIcon = React.cloneElement(icon, { 
    'aria-hidden': 'true',
    focusable: 'false',
    ...icon.props,
  });

  // CSS for the visually hidden element
  const visuallyHiddenStyle = hideLabel ? {
    border: 0,
    clip: 'rect(0, 0, 0, 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    width: '1px',
    whiteSpace: 'nowrap',
  } : {};

  return (
    <span role="img" aria-label={label} {...otherProps} ref={ref}>
      {accessibleIcon}
      {label && (
        <Text style={visuallyHiddenStyle} className="sr-only">
          {label}
        </Text>
      )}
    </span>
  );
});

AccessibleIcon.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  hideLabel: PropTypes.bool,
};

// Display name for debugging
AccessibleIcon.displayName = 'AccessibleIcon';

export default AccessibleIcon;
