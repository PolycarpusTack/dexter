// File: frontend/src/components/UI/AccessibleIcon.tsx

import React, { ReactNode, CSSProperties } from 'react';
import { Text } from '@mantine/core';

interface AccessibleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: ReactNode;
  label: string;
  hideLabel?: boolean;
}

/**
 * AccessibleIcon component that wraps an icon with an accessible label
 * Improves accessibility by providing screen reader text while keeping the visual experience unchanged
 */
const AccessibleIcon = React.forwardRef<HTMLSpanElement, AccessibleIconProps>(({ 
  icon, 
  label, 
  hideLabel = true,
  ...otherProps 
}, ref) => {
  if (!icon) {
    return null;
  }

  // Clone the icon to ensure proper props are passed
  const accessibleIcon = React.cloneElement(React.Children.only(icon as React.ReactElement), { 
    'aria-hidden': 'true',
    focusable: 'false',
  });

  // CSS for the visually hidden element
  const visuallyHiddenStyle: CSSProperties = hideLabel ? {
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

// Display name for debugging
AccessibleIcon.displayName = 'AccessibleIcon';

export default AccessibleIcon;