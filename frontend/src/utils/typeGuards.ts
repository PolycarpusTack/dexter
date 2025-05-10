// Type guards for Sentry events and EventType compatibility

import { SentryEvent } from '../types/deadlock';
import { EventType, EventTag } from '../types/eventTypes';

/**
 * Checks if an EventType can be used as a SentryEvent
 */
export function isEventCompatibleWithSentryEvent(event: EventType | SentryEvent): event is SentryEvent {
  if (!event) return false;
  
  // Check if essential SentryEvent properties exist and are of correct type
  const sentryEvent = event as any;
  
  return (
    typeof sentryEvent.id === 'string' &&
    typeof sentryEvent.message === 'string' &&
    (sentryEvent.project === undefined || 
      (typeof sentryEvent.project === 'object' && 
       sentryEvent.project !== null &&
       'id' in sentryEvent.project))
  );
}

/**
 * Converts EventType to SentryEvent format
 */
export function convertEventTypeToSentryEvent(event: EventType): SentryEvent {
  // Ensure project is in object format
  const project = typeof event.project === 'string' 
    ? { id: event.project, name: event.project } 
    : event.project;
    
  return {
    ...event,
    id: event.id,
    message: event.message || event.title || '',
    title: event.title || event.message || '',
    timestamp: event.timestamp || new Date().toISOString(),
    level: event.level || 'error',
    tags: ensureEventTagArray(event.tags),
    project
  } as SentryEvent;
}

/**
 * Ensures tags are in EventTag array format
 */
export function ensureEventTagArray(tags: EventTag[] | (string | EventTag)[] | undefined): EventTag[] {
  if (!tags) return [];
  
  return tags.map(tag => {
    if (typeof tag === 'string') {
      return { key: tag, value: tag };
    }
    // Ensure the tag has both key and value
    if (tag && typeof tag === 'object' && tag.key && tag.value) {
      return tag as EventTag;
    }
    // Handle tags with missing key or value
    return { 
      key: tag?.key || tag?.name || 'unknown', 
      value: tag?.value || tag?.key || tag?.name || 'unknown' 
    };
  }).filter(tag => tag !== null && typeof tag === 'object');
}
