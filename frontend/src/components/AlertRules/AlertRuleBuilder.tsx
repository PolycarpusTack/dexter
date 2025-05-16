import { useState, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Select,
  NumberInput,
  Button,
  Group,
  Title,
  Divider,
  Card,
  Text,
  Tabs,
  MultiSelect,
  JsonInput,
  Badge,
  ActionIcon,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBell,
  IconChartBar,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/unified';
import { AlertRule, AlertRuleAction, AlertRuleInput } from '../../api/unified/alertsApi';

// Local type definitions for form values
interface AlertRuleCondition {
  id: string;
  value?: number;
  interval?: string;
}

interface AlertRuleFilter {
  id: string;
  comparison?: string;
  value?: string;
}

interface MetricAlertTrigger {
  label: string;
  threshold: number;
  alertFrequency: number;
  thresholdType: 'above' | 'below';
}

interface IssueAlertRule {
  name: string;
  environment: string;
  actionMatch: 'all' | 'any' | 'none';
  filterMatch: 'all' | 'any' | 'none';
  conditions: AlertRuleCondition[];
  filters: AlertRuleFilter[];
  actions: AlertRuleAction[];
  frequency: number;
}

interface MetricAlertRule {
  name: string;
  aggregate: string;
  dataset: string;
  query: string;
  environment: string;
  timeWindow: number;
  thresholdType: 'static' | 'percent';
  triggers: MetricAlertTrigger[];
  criticalActions: AlertRuleAction[];
  warningActions: AlertRuleAction[];
  resolveActions: AlertRuleAction[];
  owner: string;
}

interface AlertRuleBuilderProps {
  editingRule?: AlertRule;
  ruleType?: 'issue' | 'metric';
  onSave: () => void;
  onCancel: () => void;
}

// Common conditions for issue alerts
const ISSUE_CONDITIONS = [
  { value: 'sentry.rules.conditions.first_seen_event.FirstSeenEventCondition', label: 'A new issue is created' },
  { value: 'sentry.rules.conditions.regression_event.RegressionEventCondition', label: 'The issue changes state from resolved to unresolved' },
  { value: 'sentry.rules.conditions.event_frequency.EventFrequencyCondition', label: 'The issue is seen more than X times in Y minutes' },
  { value: 'sentry.rules.conditions.event_frequency.EventUniqueUserFrequencyCondition', label: 'The issue is seen by more than X users in Y minutes' },
];

// Common filters for issue alerts
const ISSUE_FILTERS = [
  { value: 'sentry.rules.filters.age_comparison.AgeComparisonFilter', label: 'The issue is older/newer than X days' },
  { value: 'sentry.rules.filters.issue_occurrences.IssueOccurrencesFilter', label: 'The issue has happened at least X times' },
  { value: 'sentry.rules.filters.assigned_to.AssignedToFilter', label: 'The issue is assigned to...' },
  { value: 'sentry.rules.filters.latest_release.LatestReleaseFilter', label: 'The event is from the latest release' },
];

// Common actions for issue alerts
const ISSUE_ACTIONS = [
  { value: 'sentry.mail.actions.NotifyEmailAction', label: 'Send an email notification' },
  { value: 'sentry.integrations.slack.notify_action.SlackNotifyServiceAction', label: 'Send a Slack notification' },
  { value: 'sentry.integrations.msteams.notify_action.MsTeamsNotifyServiceAction', label: 'Send a Microsoft Teams notification' },
  { value: 'sentry.integrations.discord.notify_action.DiscordNotifyServiceAction', label: 'Send a Discord notification' },
  { value: 'sentry.integrations.jira.notify_action.JiraCreateTicketAction', label: 'Create a Jira ticket' },
  { value: 'sentry.integrations.github.notify_action.GitHubCreateTicketAction', label: 'Create a GitHub issue' },
];

// Common metric alert aggregates
const METRIC_AGGREGATES = [
  { value: 'count()', label: 'Number of errors' },
  { value: 'count_unique(user)', label: 'Users experiencing errors' },
  { value: 'percentage(sessions_crashed, sessions)', label: 'Crash free session rate' },
  { value: 'percentage(users_crashed, users)', label: 'Crash free user rate' },
  { value: 'avg(transaction.duration)', label: 'Transaction duration (average)' },
  { value: 'p50(transaction.duration)', label: 'Transaction duration (p50)' },
  { value: 'p95(transaction.duration)', label: 'Transaction duration (p95)' },
  { value: 'failure_rate()', label: 'Failure rate' },
];

export function AlertRuleBuilder({
  editingRule,
  ruleType: initialRuleType,
  onSave,
  onCancel,
}: AlertRuleBuilderProps) {
  const { org, project } = useParams<{ org: string; project: string }>();
  const [loading, setLoading] = useState(false);
  const [ruleType, setRuleType] = useState<'issue' | 'metric'>(
    initialRuleType || editingRule?.type || 'issue'
  );

  // Form for issue alert rules
  const issueForm = useForm<IssueAlertRule>({
    initialValues: {
      name: '',
      actionMatch: 'all',
      conditions: [],
      actions: [],
      frequency: 30,
      environment: '',
      filterMatch: 'all',
      filters: [],
    },
  });

  // Form for metric alert rules
  const metricForm = useForm<MetricAlertRule>({
    initialValues: {
      name: '',
      aggregate: 'count()',
      timeWindow: 5,
      projects: project ? [`${project}`] : [],
      query: '',
      thresholdType: 0,
      triggers: [],
      environment: '',
      dataset: 'events',
    },
  });

  // Load existing rule data if editing
  useEffect(() => {
    if (editingRule) {
      loadRuleData();
    }
  }, [editingRule]);

  const loadRuleData = async () => {
    if (!editingRule || !project) return;

    try {
      const ruleData = await api.alerts.getAlertRule({
        projectSlug: project,
        organizationSlug: org || '',
        projectId: project,
        organizationId: org || '',
        ruleId: editingRule.id
      });

      if (ruleType === 'issue') {
        issueForm.setValues(ruleData as IssueAlertRule);
      } else {
        metricForm.setValues(ruleData as MetricAlertRule);
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load alert rule data',
        color: 'red',
      });
    }
  };

  const handleSubmit = async () => {
    if (!project) return;

    try {
      setLoading(true);
      
      if (ruleType === 'issue') {
        const values = issueForm.values;
        const ruleInput: AlertRuleInput = {
          name: values.name,
          conditions: values.conditions,
          filters: values.filters,
          actions: values.actions,
          environment: values.environment || null,
          frequency: values.frequency
        };
        
        if (editingRule) {
          await api.alerts.updateAlertRule({
            projectSlug: project,
            organizationSlug: org || '',
            projectId: project,
            organizationId: org || '',
            ruleId: editingRule.id,
            rule: ruleInput
          });
        } else {
          await api.alerts.createAlertRule({
            projectSlug: project,
            organizationSlug: org || '',
            projectId: project,
            organizationId: org || '',
            rule: ruleInput
          });
        }
      } else {
        const values = metricForm.values;
        const ruleInput: AlertRuleInput = {
          name: values.name,
          dataset: values.dataset,
          query: values.query,
          environment: values.environment || null,
          timeWindow: values.timeWindow,
          aggregation: values.aggregate,
          projectIds: [project]
        };
        
        if (editingRule) {
          await api.alerts.updateAlertRule({
            projectSlug: project,
            organizationSlug: org || '',
            projectId: project,
            organizationId: org || '',
            ruleId: editingRule.id,
            rule: ruleInput
          });
        } else {
          await api.alerts.createAlertRule({
            projectSlug: project,
            organizationSlug: org || '',
            projectId: project,
            organizationId: org || '',
            rule: ruleInput
          });
        }
      }

      notifications.show({
        title: 'Success',
        message: editingRule ? 'Alert rule updated' : 'Alert rule created',
        color: 'green',
      });
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save alert rule';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Render helpers for conditions, filters, and actions
  const renderCondition = (condition: AlertRuleCondition, index: number) => {
    return (
      <Card key={index} withBorder>
        <Group justify="space-between" mb="sm">
          <Select
            label="Condition"
            data={ISSUE_CONDITIONS}
            value={condition.id}
            onChange={(value) => {
              if (value) {
                issueForm.setFieldValue(`conditions.${index}.id`, value);
              }
            }}
            required
            style={{ flex: 1 }}
          />
          <ActionIcon
            color="red"
            onClick={() => {
              const newConditions = [...issueForm.values.conditions];
              newConditions.splice(index, 1);
              issueForm.setFieldValue('conditions', newConditions);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        {condition.id.includes('EventFrequency') && (
          <Group grow>
            <NumberInput
              label="Value"
              placeholder="Count"
              value={condition.value}
              onChange={(value) => {
                issueForm.setFieldValue(`conditions.${index}.value`, value ?? undefined);
              }}
              required
            />
            <Select
              label="Interval"
              data={[
                { value: '1m', label: '1 minute' },
                { value: '5m', label: '5 minutes' },
                { value: '15m', label: '15 minutes' },
                { value: '1h', label: '1 hour' },
                { value: '1d', label: '1 day' },
              ]}
              value={condition.interval}
              onChange={(value) => {
                issueForm.setFieldValue(`conditions.${index}.interval`, value ?? undefined);
              }}
              required
            />
          </Group>
        )}
      </Card>
    );
  };

  const renderFilter = (filter: AlertRuleFilter, index: number) => {
    return (
      <Card key={index} withBorder>
        <Group justify="space-between" mb="sm">
          <Select
            label="Filter"
            data={ISSUE_FILTERS}
            value={filter.id}
            onChange={(value) => {
              if (value) {
                issueForm.setFieldValue(`filters.${index}.id`, value);
              }
            }}
            required
            style={{ flex: 1 }}
          />
          <ActionIcon
            color="red"
            onClick={() => {
              const newFilters = [...issueForm.values.filters!];
              newFilters.splice(index, 1);
              issueForm.setFieldValue('filters', newFilters);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        {filter.id.includes('AgeComparison') && (
          <Group grow>
            <Select
              label="Comparison"
              data={[
                { value: 'older', label: 'Older than' },
                { value: 'newer', label: 'Newer than' },
              ]}
              value={filter.comparison_type}
              onChange={(value) => {
                issueForm.setFieldValue(`filters.${index}.comparison_type`, value ?? undefined);
              }}
              required
            />
            <NumberInput
              label="Value"
              placeholder="Days"
              value={filter.value}
              onChange={(value) => {
                issueForm.setFieldValue(`filters.${index}.value`, typeof value === 'number' ? value : 0);
              }}
              required
            />
            <Select
              label="Time unit"
              data={[
                { value: 'minute', label: 'Minutes' },
                { value: 'hour', label: 'Hours' },
                { value: 'day', label: 'Days' },
                { value: 'week', label: 'Weeks' },
              ]}
              value={filter.time}
              onChange={(value) => {
                issueForm.setFieldValue(`filters.${index}.time`, value ?? undefined);
              }}
              required
            />
          </Group>
        )}

        {filter.id.includes('IssueOccurrences') && (
          <NumberInput
            label="Minimum occurrences"
            placeholder="Number of times"
            value={filter.value}
            onChange={(value) => {
              issueForm.setFieldValue(`filters.${index}.value`, typeof value === 'number' ? value : 0);
            }}
            required
          />
        )}

        {filter.id.includes('AssignedTo') && (
          <Select
            label="Target type"
            data={[
              { value: 'Unassigned', label: 'Unassigned' },
              { value: 'Team', label: 'Team' },
              { value: 'Member', label: 'Member' },
            ]}
            value={filter.targetType}
            onChange={(value) => {
              issueForm.setFieldValue(`filters.${index}.targetType`, value ?? undefined);
            }}
            required
          />
        )}
      </Card>
    );
  };

  const renderAction = (action: AlertRuleAction, index: number) => {
    return (
      <Card key={index} withBorder>
        <Group justify="space-between" mb="sm">
          <Select
            label="Action"
            data={ISSUE_ACTIONS}
            value={action.id}
            onChange={(value) => {
              if (value) {
                issueForm.setFieldValue(`actions.${index}.id`, value);
              }
            }}
            required
            style={{ flex: 1 }}
          />
          <ActionIcon
            color="red"
            onClick={() => {
              const newActions = [...issueForm.values.actions];
              newActions.splice(index, 1);
              issueForm.setFieldValue('actions', newActions);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        {action.id.includes('NotifyEmailAction') && (
          <Group grow>
            <Select
              label="Target type"
              data={[
                { value: 'IssueOwners', label: 'Issue owners' },
                { value: 'Team', label: 'Team' },
                { value: 'Member', label: 'Member' },
              ]}
              value={action.targetType}
              onChange={(value) => {
                issueForm.setFieldValue(`actions.${index}.targetType`, value ?? undefined);
              }}
              required
            />
            {action.targetType && action.targetType !== 'IssueOwners' && (
              <TextInput
                label="Target identifier"
                placeholder="Team/Member ID"
                value={action.targetIdentifier}
                onChange={(event) => {
                  issueForm.setFieldValue(
                    `actions.${index}.targetIdentifier`,
                    event.currentTarget.value
                  );
                }}
                required
              />
            )}
          </Group>
        )}

        {action.id.includes('SlackNotifyServiceAction') && (
          <Group grow>
            <NumberInput
              label="Workspace ID"
              placeholder="Slack workspace ID"
              value={action.workspace}
              onChange={(value) => {
                issueForm.setFieldValue(`actions.${index}.workspace`, typeof value === 'number' ? value : 0);
              }}
              required
            />
            <TextInput
              label="Channel"
              placeholder="#channel or @user"
              value={action.channel}
              onChange={(event) => {
                issueForm.setFieldValue(
                  `actions.${index}.channel`,
                  event.currentTarget.value
                );
              }}
              required
            />
          </Group>
        )}

        {action.id.includes('JiraCreateTicketAction') && (
          <Group grow>
            <NumberInput
              label="Integration ID"
              placeholder="Jira integration ID"
              value={action.integration}
              onChange={(value) => {
                issueForm.setFieldValue(`actions.${index}.integration`, typeof value === 'number' ? value : 0);
              }}
              required
            />
            <TextInput
              label="Project"
              placeholder="Jira project ID"
              value={action.project}
              onChange={(event) => {
                issueForm.setFieldValue(
                  `actions.${index}.project`,
                  event.currentTarget.value
                );
              }}
              required
            />
            <TextInput
              label="Issue Type"
              placeholder="Issue type ID"
              value={action.issue_type}
              onChange={(event) => {
                issueForm.setFieldValue(
                  `actions.${index}.issue_type`,
                  event.currentTarget.value
                );
              }}
              required
            />
          </Group>
        )}
      </Card>
    );
  };

  const renderTrigger = (trigger: MetricAlertTrigger, index: number) => {
    return (
      <Card key={index} withBorder>
        <Group justify="space-between" mb="sm">
          <Badge
            color={trigger.label === 'critical' ? 'red' : 'yellow'}
            size="lg"
          >
            {trigger.label}
          </Badge>
          <ActionIcon
            color="red"
            onClick={() => {
              const newTriggers = [...metricForm.values.triggers];
              newTriggers.splice(index, 1);
              metricForm.setFieldValue('triggers', newTriggers);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        <NumberInput
          label="Alert Threshold"
          placeholder="Threshold value"
          value={trigger.alertThreshold}
          onChange={(value) => {
            metricForm.setFieldValue(`triggers.${index}.alertThreshold`, typeof value === 'number' ? value : 0);
          }}
          mb="sm"
          required
        />

        <Text fw={500} mb="xs">Actions</Text>
        {trigger.actions.map((action: AlertRuleAction, actionIndex: number) => (
          <Card key={actionIndex} withBorder mb="xs">
            <Group justify="space-between" mb="sm">
              <Select
                label="Action"
                data={ISSUE_ACTIONS}
                value={action.id}
                onChange={(value) => {
                  if (value) {
                    metricForm.setFieldValue(
                      `triggers.${index}.actions.${actionIndex}.id`,
                      value
                    );
                  }
                }}
                required
                style={{ flex: 1 }}
              />
              <ActionIcon
                color="red"
                onClick={() => {
                  const newActions = [...trigger.actions];
                  newActions.splice(actionIndex, 1);
                  metricForm.setFieldValue(`triggers.${index}.actions`, newActions);
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Card>
        ))}

        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            const newActions = [...trigger.actions, { id: '' }];
            metricForm.setFieldValue(`triggers.${index}.actions`, newActions);
          }}
          fullWidth
        >
          Add Action
        </Button>
      </Card>
    );
  };

  return (
    <Stack>
      <Title order={2}>
        {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
      </Title>
      
      {!editingRule && (
        <Tabs value={ruleType} onChange={(value: string | null) => setRuleType(value as 'issue' | 'metric')}>
          <Tabs.List>
            <Tabs.Tab value="issue" leftSection={<IconAlertCircle size={16} />}>
              Issue Alert
            </Tabs.Tab>
            <Tabs.Tab value="metric" leftSection={<IconChartBar size={16} />}>
              Metric Alert
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      )}

      {ruleType === 'issue' ? (
        <form onSubmit={issueForm.onSubmit(() => handleSubmit())}>
          <Stack>
            <TextInput
              label="Rule Name"
              placeholder="Enter rule name"
              required
              {...issueForm.getInputProps('name')}
            />

            <TextInput
              label="Environment"
              placeholder="e.g., production"
              {...issueForm.getInputProps('environment')}
            />

            <Divider label="Conditions" labelPosition="center" />

            <Select
              label="Match"
              data={[
                { value: 'all', label: 'All conditions must match' },
                { value: 'any', label: 'Any condition must match' },
                { value: 'none', label: 'No conditions must match' },
              ]}
              {...issueForm.getInputProps('actionMatch')}
            />

            {issueForm.values.conditions.map((condition: AlertRuleCondition, index: number) =>
              renderCondition(condition, index)
            )}

            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                issueForm.setFieldValue('conditions', [
                  ...issueForm.values.conditions,
                  { id: '' },
                ]);
              }}
            >
              Add Condition
            </Button>

            <Divider label="Filters (Optional)" labelPosition="center" />

            {issueForm.values.filters && issueForm.values.filters.length > 0 && (
              <Select
                label="Filter Match"
                data={[
                  { value: 'all', label: 'All filters must match' },
                  { value: 'any', label: 'Any filter must match' },
                  { value: 'none', label: 'No filters must match' },
                ]}
                {...issueForm.getInputProps('filterMatch')}
              />
            )}

            {issueForm.values.filters?.map((filter: AlertRuleFilter, index: number) =>
              renderFilter(filter, index)
            )}

            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                issueForm.setFieldValue('filters', [
                  ...(issueForm.values.filters || []),
                  { id: '' },
                ]);
              }}
            >
              Add Filter
            </Button>

            <Divider label="Actions" labelPosition="center" />

            {issueForm.values.actions.map((action: AlertRuleAction, index: number) =>
              renderAction(action, index)
            )}

            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                issueForm.setFieldValue('actions', [
                  ...issueForm.values.actions,
                  { id: '' },
                ]);
              }}
            >
              Add Action
            </Button>

            <NumberInput
              label="Frequency (minutes)"
              description="How often to perform the actions once for an issue"
              min={5}
              max={43200}
              {...issueForm.getInputProps('frequency')}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={loading}
                disabled={issueForm.values.conditions.length === 0 || issueForm.values.actions.length === 0}
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <form onSubmit={metricForm.onSubmit(() => handleSubmit())}>
          <Stack>
            <TextInput
              label="Rule Name"
              placeholder="Enter rule name"
              required
              {...metricForm.getInputProps('name')}
            />

            <TextInput
              label="Environment"
              placeholder="e.g., production"
              {...metricForm.getInputProps('environment')}
            />

            <MultiSelect
              label="Projects"
              description="Select projects to monitor"
              placeholder="Choose projects"
              data={[
                { value: project || '', label: project || '' }
              ]}
              defaultValue={project ? [project] : []}
              {...metricForm.getInputProps('projects')}
              required
            />

            <JsonInput
              label="Additional Configuration"
              description="Advanced configuration in JSON format"
              placeholder='{"custom": "config"}'
              formatOnBlur
              autosize
              minRows={4}
            />

            <Select
              label="Metric"
              data={METRIC_AGGREGATES}
              required
              {...metricForm.getInputProps('aggregate')}
              leftSection={<IconBell size={16} />}
            />

            <Select
              label="Time Window"
              data={[
                { value: '1', label: '1 minute' },
                { value: '5', label: '5 minutes' },
                { value: '10', label: '10 minutes' },
                { value: '15', label: '15 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '60', label: '1 hour' },
                { value: '120', label: '2 hours' },
                { value: '240', label: '4 hours' },
                { value: '1440', label: '24 hours' },
              ]}
              required
              {...metricForm.getInputProps('timeWindow')}
            />

            <TextInput
              label="Query"
              placeholder="e.g., transaction:/api/checkout"
              description="Filter events using Sentry search syntax"
              {...metricForm.getInputProps('query')}
            />

            <Select
              label="Threshold Type"
              data={[
                { value: '0', label: 'Above' },
                { value: '1', label: 'Below' },
              ]}
              required
              {...metricForm.getInputProps('thresholdType')}
            />

            <Divider label="Triggers" labelPosition="center" />

            {metricForm.values.triggers.map((trigger: MetricAlertTrigger, index: number) =>
              renderTrigger(trigger, index)
            )}

            <Group>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                color="red"
                onClick={() => {
                  metricForm.setFieldValue('triggers', [
                    ...metricForm.values.triggers,
                    { label: 'critical', alertThreshold: 0, actions: [] },
                  ]);
                }}
                disabled={metricForm.values.triggers.some((t: MetricAlertTrigger) => t.label === 'critical')}
              >
                Add Critical Trigger
              </Button>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                color="yellow"
                onClick={() => {
                  metricForm.setFieldValue('triggers', [
                    ...metricForm.values.triggers,
                    { label: 'warning', alertThreshold: 0, actions: [] },
                  ]);
                }}
                disabled={metricForm.values.triggers.some((t: MetricAlertTrigger) => t.label === 'warning')}
              >
                Add Warning Trigger
              </Button>
            </Group>

            {metricForm.values.triggers.length === 0 && (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                At least one critical trigger is required for metric alerts
              </Alert>
            )}

            <NumberInput
              label="Resolve Threshold"
              description="Optional value that the metric needs to reach to resolve the alert"
              {...metricForm.getInputProps('resolveThreshold')}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={loading}
                disabled={!metricForm.values.triggers.some((t: MetricAlertTrigger) => t.label === 'critical')}
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Stack>
  );
}
