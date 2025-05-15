/**
 * @deprecated This file is archived. Import from 'api/unified' instead.
 * See the metricsApi.ts and related hooks in the unified directory.
 */

// Re-export from unified for backward compatibility
import { 
  getEventMetrics,
  getIssueMetrics,
  getErrorDistribution
} from '../unified/metricsApi';

export {
  getEventMetrics,
  getIssueMetrics,
  getErrorDistribution
};