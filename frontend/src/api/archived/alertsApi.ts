/**
 * @deprecated This file is archived. Import from 'api/unified/alertsApi' instead.
 * See the alertsApi.ts and related hooks in the unified directory.
 */

// Re-export from unified for backward compatibility
import { 
  getAlertRules,
  getAlertRule,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  triggerAlertTest
} from '../unified/alertsApi';

export {
  getAlertRules,
  getAlertRule,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  triggerAlertTest
};