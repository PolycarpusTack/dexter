// Unified Alerts API client

import { callEndpoint } from './apiClient';

/**
 * List issue alert rules for a project
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @returns {Promise} - Promise resolving to the list of alert rules
 */
export const listIssueAlertRules = async (organizationSlug, projectSlug) => {
  return callEndpoint(
    'issue_alert_rules',
    'list',
    { organization_slug: organizationSlug, project_slug: projectSlug }
  );
};

/**
 * Get details for a specific issue alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {string} ruleId - Rule ID
 * @returns {Promise} - Promise resolving to the alert rule details
 */
export const getIssueAlertRule = async (organizationSlug, projectSlug, ruleId) => {
  return callEndpoint(
    'issue_alert_rules',
    'detail',
    {
      organization_slug: organizationSlug,
      project_slug: projectSlug,
      rule_id: ruleId
    }
  );
};

/**
 * Create a new issue alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {Object} ruleData - Alert rule data
 * @returns {Promise} - Promise resolving to the created alert rule
 */
export const createIssueAlertRule = async (organizationSlug, projectSlug, ruleData) => {
  return callEndpoint(
    'issue_alert_rules',
    'create',
    { organization_slug: organizationSlug, project_slug: projectSlug },
    {},
    ruleData
  );
};

/**
 * Update an issue alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {string} ruleId - Rule ID
 * @param {Object} ruleData - Updated alert rule data
 * @returns {Promise} - Promise resolving to the updated alert rule
 */
export const updateIssueAlertRule = async (organizationSlug, projectSlug, ruleId, ruleData) => {
  return callEndpoint(
    'issue_alert_rules',
    'update',
    {
      organization_slug: organizationSlug,
      project_slug: projectSlug,
      rule_id: ruleId
    },
    {},
    ruleData
  );
};

/**
 * Delete an issue alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {string} ruleId - Rule ID
 * @returns {Promise} - Promise resolving to the deletion result
 */
export const deleteIssueAlertRule = async (organizationSlug, projectSlug, ruleId) => {
  return callEndpoint(
    'issue_alert_rules',
    'delete',
    {
      organization_slug: organizationSlug,
      project_slug: projectSlug,
      rule_id: ruleId
    }
  );
};

/**
 * List metric alert rules for an organization
 * 
 * @param {string} organizationSlug - Organization slug
 * @returns {Promise} - Promise resolving to the list of metric alert rules
 */
export const listMetricAlertRules = async (organizationSlug) => {
  return callEndpoint(
    'metric_alert_rules',
    'list',
    { organization_slug: organizationSlug }
  );
};

/**
 * Get details for a specific metric alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} ruleId - Rule ID
 * @returns {Promise} - Promise resolving to the metric alert rule details
 */
export const getMetricAlertRule = async (organizationSlug, ruleId) => {
  return callEndpoint(
    'metric_alert_rules',
    'detail',
    { organization_slug: organizationSlug, rule_id: ruleId }
  );
};

/**
 * Create a new metric alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {Object} ruleData - Alert rule data
 * @returns {Promise} - Promise resolving to the created metric alert rule
 */
export const createMetricAlertRule = async (organizationSlug, ruleData) => {
  return callEndpoint(
    'metric_alert_rules',
    'create',
    { organization_slug: organizationSlug },
    {},
    ruleData
  );
};

/**
 * Update a metric alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} ruleId - Rule ID
 * @param {Object} ruleData - Updated alert rule data
 * @returns {Promise} - Promise resolving to the updated metric alert rule
 */
export const updateMetricAlertRule = async (organizationSlug, ruleId, ruleData) => {
  return callEndpoint(
    'metric_alert_rules',
    'update',
    { organization_slug: organizationSlug, rule_id: ruleId },
    {},
    ruleData
  );
};

/**
 * Delete a metric alert rule
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} ruleId - Rule ID
 * @returns {Promise} - Promise resolving to the deletion result
 */
export const deleteMetricAlertRule = async (organizationSlug, ruleId) => {
  return callEndpoint(
    'metric_alert_rules',
    'delete',
    { organization_slug: organizationSlug, rule_id: ruleId }
  );
};

export default {
  listIssueAlertRules,
  getIssueAlertRule,
  createIssueAlertRule,
  updateIssueAlertRule,
  deleteIssueAlertRule,
  listMetricAlertRules,
  getMetricAlertRule,
  createMetricAlertRule,
  updateMetricAlertRule,
  deleteMetricAlertRule
};
