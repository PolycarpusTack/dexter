/**
 * @deprecated This file is archived. Import from 'api/unified/eventsApi' instead.
 * See the eventsApi.ts and related hooks in the unified directory.
 */

// Re-export from unified for backward compatibility
import { 
  getEvents, 
  getEvent, 
  getEventsByIssue,
  getLatestEvents
} from '../unified/eventsApi';

export {
  getEvents,
  getEvent,
  getEventsByIssue,
  getLatestEvents
};