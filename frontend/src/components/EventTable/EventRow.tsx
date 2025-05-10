// frontend/src/components/EventTable/EventRow.tsx

import React from 'react';
import { 
  Group, 
  Text, 
  Badge, 
  ThemeIcon, 
  Tooltip, 
  ActionIcon, 
  Menu,
  Box,
  useMantineTheme,
  Checkbox
} from '@mantine/core';
import { 
  IconAlertCircle, 
  IconDots, 
  IconEye, 
  IconBookmark,
  IconShare,
  IconTrash
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { DeadlockColumn } from './columns';
import SparklineCell from './columns/SparklineCell';
import ImpactCell from './columns/ImpactCell';
import SummaryCell from './columns/SummaryCell';
import { useAuditLog } from '../../hooks/useAuditLog';
import { EventRowProps } from './types';
import { EventTag } from '../../types/eventTypes';

interface ExtendedEventRowProps extends EventRowProps {
  isSelected?: boolean;
  'aria-selected'?: boolean;
  onMouseEnter?: () => void;
  isRowSelected?: boolean;
  onSelectToggle?: (eventId: string) => void;
}

/**
 * EventRow Component
 * 
 * Renders a single event row in the EventTable with enhanced features
 * including the DeadlockColumn for PostgreSQL deadlock events.
 * Supports keyboard navigation and selection state.
 */
const EventRow: React.FC<ExtendedEventRowProps> = ({ 
  event, 
  onClick, 
  onAction, 
  isSelected = false,
  isRowSelected = false,
  onSelectToggle,
  ...otherProps
}) => {
  const theme = useMantineTheme();
  const logEvent = useAuditLog('EventRow');
  
  // Format timestamp to be more readable
  const formattedTimestamp = event.timestamp 
    ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) 
    : 'Unknown time';
  
  // Format the level for display
  const level = event.level || 'error';
  const levelColor = {
    fatal: 'red',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    debug: 'gray'
  }[level.toLowerCase()] || 'gray';
  
  // Handle row click
  const handleRowClick = (): void => {
    logEvent('event_row_click', { eventId: event.id });
    if (onClick) onClick(event);
  };
  
  // Extract tags for display
  const tags = event.tags || [];
  const displayTags = tags.slice(0, 3); // Show first 3 tags
  const hasMoreTags = tags.length > 3;
  
  return (
    <tr
      onClick={handleRowClick}
      style={{ 
        cursor: 'pointer',
        backgroundColor: isSelected ? theme.colors.blue[0] : isRowSelected ? theme.colors.gray[0] : undefined,
        outline: isSelected ? `2px solid ${theme.colors.blue[4]}` : undefined
      }}
      data-event-id={event.id}
      {...otherProps}
    >
      {/* Checkbox for selection */}
      <td>
        <Checkbox
          checked={isRowSelected}
          onChange={(e) => {
            e.stopPropagation();
            if (onSelectToggle) {
              onSelectToggle(event.id);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      
      {/* Event message with summary */}
      <td>
        <Box>
          {/* Display event level with icon and color */}
          <Group gap="xs">
            <Tooltip label={`${level.toUpperCase()} level event`}>
              <ThemeIcon color={levelColor} variant="light" size="sm" radius="xl">
                <IconAlertCircle size={12} />
              </ThemeIcon>
            </Tooltip>
            <SummaryCell 
              event={event}
              showTags={false}
              maxLines={1}
            />
          </Group>
          
          {/* Display tags using badges */}
          {displayTags.length > 0 && (
            <Group gap="xs" mt={4}>
              {displayTags.map((tag, index) => {
                const tagData = typeof tag === 'string' 
                  ? { key: tag, value: tag } 
                  : tag as EventTag;
                  
                return (
                  <Badge 
                    key={`${tagData.key}-${index}`}
                    size="xs" 
                    variant="outline"
                  >
                    {tagData.key}: {tagData.value}
                  </Badge>
                );
              })}
              {hasMoreTags && (
                <Tooltip label={`View all ${tags.length} tags`}>
                  <Badge size="xs" variant="filled" color="gray">
                    +{tags.length - 3} more
                  </Badge>
                </Tooltip>
              )}
            </Group>
          )}
        </Box>
      </td>
      
      {/* Frequency sparkline */}
      <td>
        <SparklineCell event={event} />
      </td>
      
      {/* Impact visualization */}
      <td>
        <ImpactCell event={event} />
      </td>
      
      {/* Timestamp */}
      <td>
        <Text size="xs" c="dimmed">
          {formattedTimestamp}
        </Text>
      </td>
      
      {/* Deadlock column */}
      <td>
        <DeadlockColumn event={event} />
      </td>
      
      {/* Actions */}
      <td>
        <Group gap="xs" justify="flex-end" style={{ whiteSpace: 'nowrap' }}>
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon size="sm" variant="subtle" onClick={(e) => e.stopPropagation()}>
                <IconDots size={14} />
              </ActionIcon>
            </Menu.Target>
            
            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
              <Menu.Item 
                leftSection={<IconEye size={14} />}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (onAction) onAction('view', event);
                  logEvent('event_action', { action: 'view', eventId: event.id });
                }}
              >
                View Details
              </Menu.Item>
              
              <Menu.Item 
                leftSection={<IconBookmark size={14} />}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (onAction) onAction('bookmark', event);
                  logEvent('event_action', { action: 'bookmark', eventId: event.id });
                }}
              >
                Bookmark
              </Menu.Item>
              
              <Menu.Item 
                leftSection={<IconShare size={14} />}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (onAction) onAction('share', event);
                  logEvent('event_action', { action: 'share', eventId: event.id });
                }}
              >
                Share
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Item 
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (onAction) onAction('delete', event);
                  logEvent('event_action', { action: 'delete', eventId: event.id });
                }}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </td>
    </tr>
  );
};

export default EventRow;