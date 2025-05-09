// File: src/utils/tagUtils.ts

import { SentryEvent, EventTag } from '../types/deadlock';

/**
 * Interface for tag group with label and color
 */
export interface TagGroup {
  key: string;
  label: string;
  color?: string;
  priority?: number;
}

/**
 * Predefined tag groups with display information
 */
export const PREDEFINED_TAG_GROUPS: TagGroup[] = [
  {
    key: 'level',
    label: 'Level',
    color: 'red',
    priority: 100
  },
  {
    key: 'environment',
    label: 'Environment',
    color: 'blue',
    priority: 90
  },
  {
    key: 'server_name',
    label: 'Server',
    color: 'gray',
    priority: 80
  },
  {
    key: 'browser',
    label: 'Browser',
    color: 'orange',
    priority: 70
  },
  {
    key: 'os',
    label: 'OS',
    color: 'violet',
    priority: 65
  },
  {
    key: 'device',
    label: 'Device',
    color: 'teal',
    priority: 60
  },
  {
    key: 'runtime',
    label: 'Runtime',
    color: 'cyan',
    priority: 50
  },
  {
    key: 'release',
    label: 'Release',
    color: 'indigo',
    priority: 40
  },
  {
    key: 'transaction',
    label: 'Transaction',
    color: 'green',
    priority: 30
  },
  {
    key: 'user.id',
    label: 'User',
    color: 'pink',
    priority: 20
  }
];

/**
 * Extract tags from a Sentry event
 * 
 * @param event - Sentry event data
 * @returns Array of tag objects
 */
export function extractTags(event: SentryEvent): EventTag[] {
  if (!event) return [];
  
  // Direct tags from the event
  const directTags = event.tags || [];
  
  // Convert to array if it's an object
  const tags = Array.isArray(directTags)
    ? directTags.map(tag => ({ key: tag.key, value: String(tag.value) }))
    : [];
  
  // Add level as a tag if not already present
  if (event.level && !tags.some(tag => tag.key === 'level')) {
    tags.push({ key: 'level', value: event.level });
  }
  
  // Extract user ID if available
  if (event.user?.id && !tags.some(tag => tag.key === 'user.id')) {
    tags.push({ key: 'user.id', value: String(event.user.id) });
  }
  
  // Extract contexts as tags
  if (event.contexts) {
    Object.entries(event.contexts).forEach(([contextType, context]) => {
      if (typeof context === 'object' && context !== null) {
        // Add the most useful context properties as tags
        const keysToExtract = ['name', 'version', 'id', 'value', 'type'];
        
        keysToExtract.forEach(key => {
          if ((context as any)[key] !== undefined) {
            const tagKey = `${contextType}.${key}`;
            const tagValue = String((context as any)[key]);
            
            // Only add if not already present
            if (!tags.some(tag => tag.key === tagKey)) {
              tags.push({ key: tagKey, value: tagValue });
            }
          }
        });
      }
    });
  }
  
  return tags as EventTag[];
}

/**
 * Get tag display information (label and color) for a tag key
 * 
 * @param tagKey - The tag key
 * @returns Display information for the tag
 */
export function getTagGroupInfo(tagKey: string): TagGroup {
  // Find predefined tag group
  const predefinedGroup = PREDEFINED_TAG_GROUPS.find(group => 
    group.key === tagKey || tagKey.startsWith(`${group.key}.`)
  );
  
  if (predefinedGroup) {
    return predefinedGroup;
  }
  
  // Generate display name for custom tag
  let label = tagKey
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
  
  // Shorten label if too long
  if (label.length > 20) {
    label = label.substring(0, 18) + '...';
  }
  
  return {
    key: tagKey,
    label,
    color: 'gray',
    priority: 0
  };
}

/**
 * Get prioritized and grouped tags for display
 * 
 * @param tags - Array of tags
 * @param limit - Maximum number of tags to include (0 for all)
 * @returns Array of tags with display information, prioritized
 */
export function getPrioritizedTags(
  tags: EventTag[], 
  limit: number = 0
): (EventTag & { group: TagGroup })[] {
  if (!tags || !Array.isArray(tags)) return [];
  
  // Add display information to each tag
  const tagsWithDisplay = tags.map(tag => ({
    ...tag,
    group: getTagGroupInfo(tag.key)
  }));
  
  // Sort by priority
  const sortedTags = tagsWithDisplay.sort((a, b) => 
    (b.group.priority || 0) - (a.group.priority || 0)
  );
  
  // Apply limit if specified
  return limit > 0 ? sortedTags.slice(0, limit) : sortedTags;
}


export default {
  extractTags,
  getTagGroupInfo,
  getPrioritizedTags,
  PREDEFINED_TAG_GROUPS
};
