// frontend/src/components/EventTable/EventRow.jsx

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
  useMantineTheme
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
import { useAuditLog } from '../../hooks/useAuditLog';

/**
 * EventRow Component
 * 
 * Renders a single event row in the EventTable with enhanced features
 * including the DeadlockColumn for PostgreSQL deadlock events.
 */
function EventRow({ event, onClick, onAction }) {
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
  const handleRowClick = () => {
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
        '&:hover': {
          backgroundColor: theme.colors.gray[0]
        }
      }}
      data-event-id={event.id}
    >
      {/* Status/Level indicator */}
      <td>
        <ThemeIcon color={levelColor} variant="light" size="sm" radius="xl">
          <IconAlertCircle size={12} />
        </ThemeIcon>
      </td>
      
      {/* Event message */}
      <td>
        <Text size="sm" lineClamp={2}>
          {event.message || event.title || 'Unknown error'}
        </Text>
      </td>
      
      {/* Tags */}
      <td>
        <Group spacing="xs">
          {displayTags.map((tag, index) => (
            <Badge 
              key={`${tag.key}-${index}`}
              size="sm" 
              variant="outline"
            >
              {tag.key}: {tag.value}
            </Badge>
          ))}
          {hasMoreTags && (
            <Badge size="sm" variant="filled" color="gray">
              +{tags.length - 3} more
            </Badge>
          )}
        </Group>
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
        <Group spacing="xs" position="right" style={{ whiteSpace: 'nowrap' }}>
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon size="sm" variant="subtle">
                <IconDots size={14} />
              </ActionIcon>
            </Menu.Target>
            
            <Menu.Dropdown>
              <Menu.Item 
                icon={<IconEye size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('view', event);
                  logEvent('event_action', { action: 'view', eventId: event.id });
                }}
              >
                View Details
              </Menu.Item>
              
              <Menu.Item 
                icon={<IconBookmark size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('bookmark', event);
                  logEvent('event_action', { action: 'bookmark', eventId: event.id });
                }}
              >
                Bookmark
              </Menu.Item>
              
              <Menu.Item 
                icon={<IconShare size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('share', event);
                  logEvent('event_action', { action: 'share', eventId: event.id });
                }}
              >
                Share
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Item 
                icon={<IconTrash size={14} />}
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('delete', event);
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
}

export default EventRow;
