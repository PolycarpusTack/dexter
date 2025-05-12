/**
 * Alert Rules API Module
 * 
 * This module provides methods for interacting with Sentry's Alert Rules API.
 */
import client from './client';
import { resolveApiPath, loadApiConfig } from './config';

/**
 * Alert Rules API class
 */
export class AlertRulesApi {
  /**
   * Get a list of alert rules
   */
  static async getAlertRules(org, project) {
    const path = await resolveApiPath('alert_rules.list', { org, project });
    
    return client.get(path);
  }

  /**
   * Get details for a specific alert rule
   */
  static async getAlertRuleDetails(org, project, ruleId) {
    const path = await resolveApiPath('alert_rules.detail', { org, project, id: ruleId });
    
    return client.get(path);
  }

  /**
   * Create a new alert rule
   */
  static async createAlertRule(org, project, ruleData) {
    const path = await resolveApiPath('alert_rules.create', { org, project });
    
    return client.post(path, ruleData);
  }

  /**
   * Update an existing alert rule
   */
  static async updateAlertRule(org, project, ruleId, ruleData) {
    const path = await resolveApiPath('alert_rules.update', { org, project, id: ruleId });
    
    return client.put(path, ruleData);
  }

  /**
   * Delete an alert rule
   */
  static async deleteAlertRule(org, project, ruleId) {
    const path = await resolveApiPath('alert_rules.delete', { org, project, id: ruleId });
    
    return client.delete(path);
  }

  /**
   * Create a simple threshold alert rule
   */
  static async createThresholdAlert(org, project, options) {
    const {
      name, 
      metric = 'count()', 
      threshold, 
      operator = 'greater', 
      timeWindow = 60, 
      actions = []
    } = options;
    
    // Format the rule data
    const ruleData = {
      name,
      conditions: [
        {
          type: 'event',
          attribute: metric,
          operator,
          value: threshold
        }
      ],
      actionMatch: 'all',  // Trigger when all conditions match
      frequency: timeWindow,
      actions
    };
    
    return this.createAlertRule(org, project, ruleData);
  }

  /**
   * Create an email alert action
   */
  static static createEmailAction(recipients) {
    return {
      type: 'email',
      recipients: Array.isArray(recipients) ? recipients : [recipients]
    };
  }

  /**
   * Create a Slack alert action
   */
  static createSlackAction(channel) {
    return {
      type: 'slack',
      channel
    };
  }

  /**
   * Get alert rule triggers
   */
  static async getAlertRuleTriggers(org, project, ruleId, timeRange = '24h') {
    const path = await resolveApiPath('alert_rules.triggers', { org, project, id: ruleId });
    
    return client.get(path, {
      params: { timeRange }
    });
  }

  /**
   * Test an alert rule
   */
  static async testAlertRule(org, project, ruleData) {
    const path = await resolveApiPath('alert_rules.test', { org, project });
    
    return client.post(path, ruleData);
  }
}

// Initialize config when module is loaded
loadApiConfig();

// Export default instance
export default AlertRulesApi;
