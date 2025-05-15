/**
 * @deprecated This file is archived. Import from 'api/unified/discoverApi' instead.
 * See the discoverApi.ts and related hooks in the unified directory.
 */

// Re-export from unified for backward compatibility
import { 
  executeQuery,
  saveQuery,
  listSavedQueries,
  getQueryResult
} from '../unified/discoverApi';

export {
  executeQuery,
  saveQuery,
  listSavedQueries,
  getQueryResult
};