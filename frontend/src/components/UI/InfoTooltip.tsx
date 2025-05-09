// File: frontend/src/components/UI/InfoTooltip.tsx

import React, { ReactNode } from 'react';
import { Tooltip, ActionIcon, ActionIconProps, TooltipProps } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

interface InfoTooltipProps extends Omit<ActionIconProps, 'children'> {
  content: string | ReactNode;
  size?: number;
  color?: string;
  position?: TooltipProps['position'];
  iconProps?: React.ComponentPropsWithoutRef<typeof IconInfoCircle>;
  tooltipProps?: Partial<TooltipProps>;
}

/**
 * InfoTooltip component for providing contextual help
 * Displays an information icon with a tooltip on hover
 */
function InfoTooltip({
  content,
  size = 16,
  color = 'blue',
  position = 'top',
  iconProps = {},
  tooltipProps = {},
  ...otherProps
}: InfoTooltipProps): JSX.Element {
  return (
    <Tooltip
      label={content}
      position={position}
      withArrow
      arrowSize={8}
      transitionProps={{ duration: 200 }}
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

export default InfoTooltip;