// File: frontend/src/components/UI/InfoTooltip.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, ActionIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

/**
 * InfoTooltip component for providing contextual help
 * Displays an information icon with a tooltip on hover
 * 
 * @param {Object} props - Component properties
 * @param {string|React.ReactNode} props.content - Tooltip content
 * @param {number} props.size - Icon size in pixels (default: 16)
 * @param {string} props.color - Icon color (default: 'blue')
 * @param {string} props.position - Tooltip position (default: 'top')
 * @param {Object} props.iconProps - Additional props for the icon
 * @param {Object} props.tooltipProps - Additional props for the tooltip
 */
function InfoTooltip({
  content,
  size = 16,
  color = 'blue',
  position = 'top',
  iconProps = {},
  tooltipProps = {},
  ...otherProps
}) {
  return (
    <Tooltip
      label={content}
      position={position}
      withArrow
      arrowSize={8}
      transition="pop"
      transitionDuration={200}
      multiline
      width={220}
      {...tooltipProps}
    >
      <div>
        <ActionIcon
          size="sm"
          variant="subtle"
          color={color}
          aria-label="Information"
          radius="xl"
          {...otherProps}
        >
          <IconInfoCircle 
            size={size} 
            stroke={1.5}
            aria-hidden="true"
            {...iconProps}
          />
        </ActionIcon>
      </div>
    </Tooltip>
  );
}

InfoTooltip.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  size: PropTypes.number,
  color: PropTypes.string,
  position: PropTypes.string,
  iconProps: PropTypes.object,
  tooltipProps: PropTypes.object,
};

export default InfoTooltip;
