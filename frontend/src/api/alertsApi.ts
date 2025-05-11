import axios, { AxiosResponse } from 'axios';
import { config } from '../config';

// Base API configuration
const BASE_URL = config.API_BASE_URL || 'http://localhost:8000';
const ALERTS_BASE_URL = `${BASE_URL}/api/v1/projects`;

// Alert rule types
export interface AlertRuleCondition {
  id: string;
  value?: any;
  comparison_type?: string;
  interval?: string;
}

export interface AlertRuleFilter {
  id: string;
  value?: any;
  comparison_type?: string;
  time?: string;
  targetType?: string;
  targetIdentifier?: string;
}

export interface AlertRuleAction {
  id: string;
  targetType?: string;
  targetIdentifier?: string;
  integration?: number;
  fallthroughType?: string;
  workspace?: number;
  channel?: string;
  channel_id?: string;
  tags?: string;
  team?: number;
  project?: string;
  issue_type?: string;
  dynamic_form_fields?: Record<string, any>[];
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
  owner?: string;
}

export interface MetricAlertTrigger {
  label: 'critical' | 'warning';
  alertThreshold: number;
  actions: AlertRuleAction[];
}

export interface MetricAlertRule {
  name: string;
  aggregate: string;
  timeWindow: number;
  projects: string[];
  query: string;
  thresholdType: 0 | 1;
  triggers: MetricAlertTrigger[];
  environment?: string;
  dataset?: string;
  queryType?: number;
  eventTypes?: string[];
  comparisonDelta?: number;
  resolveThreshold?: number;
  owner?: string;
}

export interface AlertRuleResponse {
  id: string;
  name: string;
  dateCreated: string;
  createdBy?: Record<string, any>;
  environment?: string;
  projects: string[];
  status: string;
  type: 'issue' | 'metric';
}

// Error response interface
interface ErrorResponse {
  detail: string;
}

// API client
class AlertsApi {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  async listAlertRules(project: string): Promise<AlertRuleResponse[]> {
    try {
      const response: AxiosResponse<AlertRuleResponse[]> = await axios.get(
        `${ALERTS_BASE_URL}/${project}/rules`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to list alert rules');
      }
      throw error;
    }
  }

  async createAlertRule(
    project: string,
    ruleType: 'issue' | 'metric',
    ruleData: IssueAlertRule | MetricAlertRule
  ): Promise<AlertRuleResponse> {
    try {
      const response: AxiosResponse<AlertRuleResponse> = await axios.post(
        `${ALERTS_BASE_URL}/${project}/rules`,
        {
          rule_type: ruleType,
          rule_data: ruleData,
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to create alert rule');
      }
      throw error;
    }
  }

  async updateAlertRule(
    project: string,
    ruleId: string,
    ruleType: 'issue' | 'metric',
    ruleData: IssueAlertRule | MetricAlertRule
  ): Promise<AlertRuleResponse> {
    try {
      const response: AxiosResponse<AlertRuleResponse> = await axios.put(
        `${ALERTS_BASE_URL}/${project}/rules/${ruleId}`,
        {
          rule_type: ruleType,
          rule_data: ruleData,
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to update alert rule');
      }
      throw error;
    }
  }

  async deleteAlertRule(
    project: string,
    ruleId: string,
    ruleType: 'issue' | 'metric'
  ): Promise<void> {
    try {
      await axios.delete(
        `${ALERTS_BASE_URL}/${project}/rules/${ruleId}`,
        {
          params: { rule_type: ruleType },
          headers: this.getHeaders(),
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to delete alert rule');
      }
      throw error;
    }
  }

  async getAlertRule(
    project: string,
    ruleId: string,
    ruleType: 'issue' | 'metric'
  ): Promise<IssueAlertRule | MetricAlertRule> {
    try {
      const response: AxiosResponse<IssueAlertRule | MetricAlertRule> = await axios.get(
        `${ALERTS_BASE_URL}/${project}/rules/${ruleId}`,
        {
          params: { rule_type: ruleType },
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to get alert rule');
      }
      throw error;
    }
  }
}

export const alertsApi = new AlertsApi();
