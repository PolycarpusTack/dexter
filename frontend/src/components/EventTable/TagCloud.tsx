// File: src/components/EventTable/TagCloud.tsx

import React from 'react';
import { 
  Group, 
  Badge, 
  Text, 
  Tooltip, 
  Paper, 
  Stack, 
  HoverCard,
  Box,
  Divider
} from '@mantine/core';
import { IconInfoCircle, IconTag } from '@tabler/icons-react';
import { EventTag } from '../../types/deadlock';
import { getTagGroupInfo, getPrioritizedTags, PREDEFINED_TAG_GROUPS } from '../../utils/tagUtils';

interface TagCloudProps {
  tags: EventTag[];
  limit?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onClick?: (tag: EventTag) => void;
  showTooltips?: boolean;
  variant?: 'filled' | 'outline' | 'light';
}

/**
 * TagCloud component for displaying event tags with tooltips
 */
const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  limit = 5,
  size = 'xs',
  onClick,
  showTooltips = true,
  variant = 'light'
}) => {
  // If no tags, return nothing
  if (!tags || tags.length === 0) {
    return null;
  }
  
  // Get prioritized tags
  const prioritizedTags = getPrioritizedTags(tags);
  
  // Split into visible and hidden tags
  const visibleTags = limit > 0 ? prioritizedTags.slice(0, limit) : prioritizedTags;
  const hiddenTags = limit > 0 && prioritizedTags.length > limit ? 
    prioritizedTags.slice(limit) : [];
  
  // Tag click handler
  const handleTagClick = (tag: EventTag) => {
    if (onClick) {
      onClick(tag);
    }
  };
  
  return (
    <Group spacing="xs" position="left" align="center">
      {/* Display visible tags */}
      {visibleTags.map((tag, index) => (
        <TagBadge 
          key={`${tag.key}-${index}`}
          tag={tag}
          size={size}
          onClick={handleTagClick}
          showTooltip={showTooltips}
          variant={variant}
        />
      ))}
      
      {/* Display overflow indicator with hover card */}
      {hiddenTags.length > 0 && (
        <HoverCard width={280} shadow="md" withArrow>
          <HoverCard.Target>
            <Badge
              size={size}
              variant="outline"
              sx={{ cursor: 'pointer' }}
            >
              +{hiddenTags.length} more
            </Badge>
          </HoverCard.Target>
          
          <HoverCard.Dropdown>
            <Stack spacing="xs">
              <Text size="sm" fw={500}>All Tags</Text>
              <Divider />
              <Group spacing="xs" style={{ flexWrap: 'wrap' }}>
                {prioritizedTags.map((tag, index) => (
                  <TagBadge 
                    key={`hover-${tag.key}-${index}`}
                    tag={tag}
                    size={size}
                    onClick={handleTagClick}
                    showTooltip={false}
                    variant={variant}
                  />
                ))}
              </Group>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      )}
    </Group>
  );
};

interface TagBadgeProps {
  tag: EventTag & { group?: any };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onClick?: (tag: EventTag) => void;
  showTooltip?: boolean;
  variant?: 'filled' | 'outline' | 'light';
}

/**
 * Individual tag badge with tooltip
 */
const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'xs',
  onClick,
  showTooltip = true,
  variant = 'light'
}) => {
  // Get tag group info for display
  const tagInfo = tag.group || getTagGroupInfo(tag.key);
  
  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(tag);
    }
  };
  
  // For level tag, determine color based on value
  const getBadgeColor = () => {
    if (tag.key === 'level') {
      switch (tag.value.toLowerCase()) {
        case 'error': return 'red';
        case 'warning': return 'orange';
        case 'info': return 'blue';
        case 'debug': return 'gray';
        default: return tagInfo.color;
      }
    }
    return tagInfo.color;
  };
  
  const badge = (
    <Badge 
      color={getBadgeColor()} 
      size={size}
      variant={variant}
      onClick={handleClick}
      sx={{ cursor: onClick ? 'pointer' : 'default' }}
      leftSection={tag.key === 'level' ? undefined : <IconTag size={8} />}
    >
      {tag.value}
    </Badge>
  );
  
  // If tooltip is disabled, return just the badge
  if (!showTooltip) {
    return badge;
  }
  
  // Otherwise wrap in tooltip
  return (
    <Tooltip 
      label={`${tagInfo.label}: ${tag.value}`}
      position="top"
      withArrow
      size="xs"
    >
      {badge}
    </Tooltip>
  );
};

export default TagCloud;
