import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Group,
  Stack,
  Title,
  Alert,
  Loader,
  ActionIcon,
  Modal,
  Text,
  Badge,
  Table,
  Tooltip,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconBell,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../api/unified';
import { AlertRule } from '../../api/unified/alertsApi';
import { AlertRuleBuilder } from './AlertRuleBuilder';
import { useParams } from 'react-router-dom';

const AlertRules = () => {
  const { org, project } = useParams<{ org: string; project: string }>();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<{
    rule: AlertRule;
    type: 'issue' | 'metric';
  } | null>(null);

  useEffect(() => {
    if (project) {
      loadRules();
    }
  }, [project]);

  const loadRules = async () => {
    if (!project) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.alerts.listAlertRules({
        projectSlug: project,
        organizationSlug: org || '',
        projectId: project,
        organizationId: org || ''
      });
      setRules(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load alert rules';
      setError(message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rule: AlertRule) => {
    if (!project) return;
    
    try {
      await api.alerts.deleteAlertRule({
        projectSlug: project,
        organizationSlug: org || '',
        projectId: project,
        organizationId: org || '',
        ruleId: rule.id
      });
      notifications.show({
        title: 'Success',
        message: `Alert rule "${rule.name}" deleted`,
        color: 'green',
      });
      loadRules();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete alert rule';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule({ rule, type: rule.queryType || 'issue' });
    setShowBuilder(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setShowBuilder(true);
  };

  const handleSave = () => {
    setShowBuilder(false);
    setEditingRule(null);
    loadRules();
  };

  if (loading) {
    return (
      <Card>
        <Group justify="center" mt="xl">
          <Loader size="lg" />
        </Group>
      </Card>
    );
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Alert Rules</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleCreate}
        >
          Create Alert Rule
        </Button>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Card>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Environment</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <Group gap="xs">
                    <IconBell size={16} />
                    <Text fw={500}>{rule.name}</Text>
                  </Group>
                </td>
                <td>
                  <Badge
                    color={rule.type === 'issue' ? 'blue' : 'purple'}
                    variant="light"
                  >
                    {rule.type}
                  </Badge>
                </td>
                <td>
                  <Badge
                    color={rule.status === 'enabled' ? 'green' : 'gray'}
                    variant="light"
                  >
                    {rule.status}
                  </Badge>
                </td>
                <td>{rule.environment || '-'}</td>
                <td>{new Date(rule.dateCreated).toLocaleDateString()}</td>
                <td>
                  <Group gap="xs">
                    <Tooltip label="Edit">
                      <ActionIcon
                        color="blue"
                        onClick={() => handleEdit(rule)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon
                        color="red"
                        onClick={() => handleDelete(rule)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {rules.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No alert rules found. Create your first rule to get started.
          </Text>
        )}
      </Card>

      <Modal
        opened={showBuilder}
        onClose={() => setShowBuilder(false)}
        title={editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        size="xl"
      >
        <AlertRuleBuilder
          editingRule={editingRule?.rule}
          ruleType={editingRule?.type}
          onSave={handleSave}
          onCancel={() => setShowBuilder(false)}
        />
      </Modal>
    </Stack>
  );
}

export default AlertRules;
