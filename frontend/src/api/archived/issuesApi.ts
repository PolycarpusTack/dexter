/**
 * @deprecated This file is archived. Import from 'api/unified/issuesApi' instead.
 * See the issuesApi.ts and related hooks in the unified directory.
 */

// Re-export from unified for backward compatibility
import { 
  getIssues, 
  getIssue,
  updateIssue,
  assignIssue,
  bulkUpdateIssues
} from '../unified/issuesApi';

export {
  getIssues,
  getIssue,
  updateIssue,
  assignIssue,
  bulkUpdateIssues
};