/**
 * @deprecated This API module is deprecated and will be removed in v1.0.0 (Q4 2025).
 * Please use the unified API modules from 'src/api/unified' instead.
 * 
 * Migration Guide: 
 * - Replace imports from this file with imports from the unified API
 * - Refer to the migration guide at 'docs/consolidated/API_MIGRATION_MASTER_GUIDE.md'
 * 
 * Recommended replacement: import { alertsApi } from 'src/api/unified'
 * @see API_CLIENT_CONSOLIDATION_STATUS.md for migration timeline
 * @see docs/consolidated/API_MIGRATION_MASTER_GUIDE.md for detailed migration instructions
 */

/**
 * Alerts API client
 */

import { apiClient, makeRequest } from '../utils/api';

// Fallback method using apiClient if makeRequest is unavailable
async function fallbackRequest<T>({
  method,
  url,
  data,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: any;
}): Promise<T> {
  switch (method) {
    case 'GET':
      return apiClient.get(url);
    case 'POST':
      return apiClient.post(url, data);
    case 'PUT':
      return apiClient.put(url, data);
    case 'DELETE':
      return apiClient.delete(url);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

// Alert Rule Types
export interface AlertRuleResponse {
  id: string;
  name: string;
  type: 'issue' | 'metric';
  status: 'enabled' | 'disabled';
  environment?: string;
  dateCreated: string;
  dateModified?: string;
  project?: string;
  organization?: string;
}

export interface IssueAlertRule {
  name: string;
  actionMatch: 'all' | 'any' | 'none';
  conditions: AlertRuleCondition[];
  actions: AlertRuleAction[];
  frequency: number;
  environment?: string;
  filterMatch?: 'all' | 'any' | 'none';
  filters?: AlertRuleFilter[];
}

export interface MetricAlertRule {
  name: string;
  aggregate: string;
  timeWindow: number;
  projects: string[];
  query?: string;
  thresholdType: number;
  triggers: MetricAlertTrigger[];
  environment?: string;
  dataset?: string;
  resolveThreshold?: number;
}

export interface AlertRuleCondition {
  id: string;
  value?: number | string;
  interval?: string;
  comparison_type?: string;
}

export interface AlertRuleFilter {
  id: string;
  value?: number | string;
  comparison_type?: string;
  time?: string;
  targetType?: string;
}

export interface AlertRuleAction {
  id: string;
  targetType?: string;
  targetIdentifier?: string;
  workspace?: number;
  channel?: string;
  integration?: number;
  project?: string;
  issue_type?: string;
}

export interface MetricAlertTrigger {
  label: 'critical' | 'warning';
  alertThreshold: number;
  actions: AlertRuleAction[];
  resolveThreshold?: number;
}

// API Methods
export const alertsApi = {
  async listAlertRules(projectSlug: string): Promise<AlertRuleResponse[]> {
    try {
      return await makeRequest({
        method: 'GET',
        url: `/projects/${projectSlug}/alert-rules/`,
      });
    } catch (error) {
      return await fallbackRequest({
        method: 'GET',
        url: `/projects/${projectSlug}/alert-rules/`,
      });
    }
  },

  async getAlertRule(projectSlug: string, ruleId: string, type: 'issue' | 'metric'): Promise<IssueAlertRule | MetricAlertRule> {
    const endpoint = type === 'issue' ? 'issue-alert-rules' : 'metric-alert-rules';
    return makeRequest({
      method: 'GET',
      url: `/projects/${projectSlug}/${endpoint}/${ruleId}/`,
    });
  },

  async createAlertRule(projectSlug: string, type: 'issue' | 'metric', data: IssueAlertRule | MetricAlertRule): Promise<AlertRuleResponse> {
    const endpoint = type === 'issue' ? 'issue-alert-rules' : 'metric-alert-rules';
    return makeRequest({
      method: 'POST',
      url: `/projects/${projectSlug}/${endpoint}/`,
      data,
    });
  },

  async updateAlertRule(projectSlug: string, ruleId: string, type: 'issue' | 'metric', data: Partial<IssueAlertRule | MetricAlertRule>): Promise<AlertRuleResponse> {
    const endpoint = type === 'issue' ? 'issue-alert-rules' : 'metric-alert-rules';
    return makeRequest({
      method: 'PUT',
      url: `/projects/${projectSlug}/${endpoint}/${ruleId}/`,
      data,
    });
  },

  async deleteAlertRule(projectSlug: string, ruleId: string, type: 'issue' | 'metric'): Promise<void> {
    const endpoint = type === 'issue' ? 'issue-alert-rules' : 'metric-alert-rules';
    try {
      return await makeRequest({
        method: 'DELETE',
        url: `/projects/${projectSlug}/${endpoint}/${ruleId}/`,
      });
    } catch (error) {
      console.log('Using apiClient as fallback for delete operation');
      return await apiClient.delete(`/projects/${projectSlug}/${endpoint}/${ruleId}/`);
    }
  },
};
