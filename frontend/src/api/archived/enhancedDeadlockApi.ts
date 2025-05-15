/**
 * @deprecated This file is archived. Import from 'api/unified/analyzersApi' instead.
 * See the analyzersApi.ts and related hooks in the unified directory.
 */

// Re-export from unified for backward compatibility
import { 
  analyzeSqlDeadlock, 
  getDeadlockHistory, 
  getTableRelationships 
} from '../unified/analyzersApi';

export {
  analyzeSqlDeadlock,
  getDeadlockHistory,
  getTableRelationships
};