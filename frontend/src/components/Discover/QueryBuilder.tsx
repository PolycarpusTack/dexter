import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextInput,
  Select,
  Button,
  Group,
  Text,
  Stack,
  MultiSelect,
  ActionIcon,
  Paper,
  Tooltip,
  Tabs,
  Textarea,
  Autocomplete,
  Chip,
  SimpleGrid,
  Card,
  Badge,
  Modal,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconClock,
  IconFilter,
  IconSortAscending,
  IconHelp,
  IconCode,
  IconEye,
  IconWand,
  IconBookmark,
  IconShare,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../utils/api';

// Types
interface DiscoverField {
  field: string;
  alias?: string;
}

interface DiscoverQuery {
  fields: DiscoverField[];
  query?: string;
  orderby?: string;
  start?: string;
  end?: string;
  statsPeriod?: string;
  environment?: string[];
  project?: number[];
  limit?: number;
}

interface FieldSuggestion {
  name: string;
  type: string;
  description: string;
}

interface QueryExample {
  name: string;
  description: string;
  query: DiscoverQuery;
}

interface QueryBuilderProps {
  onExecute: (query: DiscoverQuery) => void;
}

// Component
const QueryBuilder: React.FC<QueryBuilderProps> = ({ onExecute }) => {
  const [activeTab, setActiveTab] = useState<string | null>('visual');
  const [query, setQuery] = useState<DiscoverQuery>({
    fields: [{ field: 'count()' }],
    query: '',
    statsPeriod: '24h',
    limit: 50,
  });
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Execute query handler
  const handleExecute = () => {
    if (query.fields.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least one field',
        color: 'red',
      });
      return;
    }
    onExecute(query);
  };
  const { data: availableFields, isLoading: fieldsLoading } = useQuery<FieldSuggestion[]>(
    ['discover-fields'],
    () => api.get('/api/discover/fields').then((res) => res.data)
  );

  // Fetch query examples
  const { data: examples } = useQuery<QueryExample[]>(
    ['discover-examples'],
    () => api.get('/api/discover/examples').then((res) => res.data)
  );

  // Convert natural language to query
  const convertNaturalLanguage = async () => {
    setIsConverting(true);
    try {
      const response = await api.post('/api/discover/natural-language', {
        query: naturalLanguageQuery,
      });
      setQuery(response.data);
      setActiveTab('visual');
      notifications.show({
        title: 'Query converted',
        message: 'Your natural language query has been converted to a Discover query',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to convert natural language query',
        color: 'red',
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Field management
  const addField = useCallback(() => {
    setQuery((prev) => ({
      ...prev,
      fields: [...prev.fields, { field: '' }],
    }));
  }, []);

  const removeField = useCallback((index: number) => {
    setQuery((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }, []);

  const updateField = useCallback((index: number, field: Partial<DiscoverField>) => {
    setQuery((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, ...field } : f)),
    }));
  }, []);

  // Time range options
  const timeRangeOptions = [
    { value: '1h', label: 'Last hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '14d', label: 'Last 14 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
  ];

  // Environment options (mock data - would fetch from API)
  const environmentOptions = [
    { value: 'production', label: 'Production' },
    { value: 'staging', label: 'Staging' },
    { value: 'development', label: 'Development' },
  ];

  // Load example query
  const loadExample = (example: QueryExample) => {
    setQuery(example.query);
    notifications.show({
      title: 'Example loaded',
      message: `Loaded "${example.name}" example query`,
      color: 'blue',
    });
  };

  return (
    <Box>
      <Stack spacing="lg">
        {/* Header */}
        <Group position="apart">
          <Text size="xl" weight={700}>
            Discover Query Builder
          </Text>
          <Group>
            <Button
              leftIcon={<IconSearch size={16} />}
              onClick={handleExecute}
            >
              Execute Query
            </Button>
            <Button
              leftIcon={<IconHelp size={16} />}
              variant="default"
              onClick={() => setShowHelpModal(true)}
            >
              Help
            </Button>
            <Button leftIcon={<IconBookmark size={16} />} variant="subtle">
              Save Query
            </Button>
            <Button leftIcon={<IconShare size={16} />} variant="subtle">
              Share
            </Button>
          </Group>
        </Group>

        {/* Query Builder Tabs */}
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="visual" icon={<IconEye size={14} />}>
              Visual Builder
            </Tabs.Tab>
            <Tabs.Tab value="natural" icon={<IconWand size={14} />}>
              Natural Language
            </Tabs.Tab>
            <Tabs.Tab value="json" icon={<IconCode size={14} />}>
              JSON
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="visual" pt="xl">
            <Stack spacing="md">
              {/* Fields */}
              <Paper p="md" withBorder>
                <Stack spacing="sm">
                  <Group position="apart">
                    <Text weight={600}>Fields</Text>
                    <Button
                      size="xs"
                      leftIcon={<IconPlus size={14} />}
                      onClick={addField}
                    >
                      Add Field
                    </Button>
                  </Group>

                  {query.fields.map((field, index) => (
                    <Group key={index} spacing="sm">
                      <Autocomplete
                        style={{ flex: 1 }}
                        placeholder="Select or type field"
                        value={field.field}
                        onChange={(value) => updateField(index, { field: value })}
                        data={
                          availableFields?.map((f) => ({
                            value: f.name,
                            label: f.name,
                          })) || []
                        }
                        loading={fieldsLoading}
                      />
                      <TextInput
                        style={{ flex: 0.5 }}
                        placeholder="Alias (optional)"
                        value={field.alias || ''}
                        onChange={(e) =>
                          updateField(index, { alias: e.target.value })
                        }
                      />
                      <ActionIcon
                        color="red"
                        onClick={() => removeField(index)}
                        disabled={query.fields.length === 1}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              </Paper>

              {/* Filters */}
              <Paper p="md" withBorder>
                <Stack spacing="sm">
                  <Text weight={600}>Filters</Text>
                  <Textarea
                    placeholder="Enter filter query (e.g., level:error AND environment:production)"
                    value={query.query || ''}
                    onChange={(e) =>
                      setQuery((prev) => ({ ...prev, query: e.target.value }))
                    }
                    autosize
                    minRows={2}
                    icon={<IconFilter size={16} />}
                  />
                </Stack>
              </Paper>

              {/* Time Range and Environment */}
              <Paper p="md" withBorder>
                <SimpleGrid cols={3} spacing="md">
                  <Select
                    label="Time Range"
                    placeholder="Select time range"
                    value={query.statsPeriod}
                    onChange={(value) =>
                      setQuery((prev) => ({ ...prev, statsPeriod: value || undefined }))
                    }
                    data={timeRangeOptions}
                    icon={<IconClock size={16} />}
                  />
                  <MultiSelect
                    label="Environment"
                    placeholder="Select environments"
                    value={query.environment || []}
                    onChange={(value) =>
                      setQuery((prev) => ({ ...prev, environment: value }))
                    }
                    data={environmentOptions}
                  />
                  <TextInput
                    label="Order By"
                    placeholder="e.g., -count()"
                    value={query.orderby || ''}
                    onChange={(e) =>
                      setQuery((prev) => ({ ...prev, orderby: e.target.value }))
                    }
                    icon={<IconSortAscending size={16} />}
                  />
                </SimpleGrid>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="natural" pt="xl">
            <Stack spacing="md">
              <Textarea
                placeholder="Describe your query in natural language (e.g., 'Show me the slowest transactions in the last 24 hours')"
                value={naturalLanguageQuery}
                onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                autosize
                minRows={4}
                icon={<IconWand size={16} />}
              />
              <Button
                leftIcon={<IconWand size={16} />}
                onClick={convertNaturalLanguage}
                loading={isConverting}
                disabled={!naturalLanguageQuery.trim()}
              >
                Convert to Query
              </Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="json" pt="xl">
            <Textarea
              value={JSON.stringify(query, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setQuery(parsed);
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              autosize
              minRows={10}
              style={{ fontFamily: 'monospace' }}
            />
          </Tabs.Panel>
        </Tabs>

        {/* Examples */}
        {examples && examples.length > 0 && (
          <Paper p="md" withBorder>
            <Stack spacing="sm">
              <Text weight={600}>Example Queries</Text>
              <SimpleGrid cols={2} spacing="md">
                {examples.map((example) => (
                  <Card key={example.name} padding="sm" withBorder>
                    <Stack spacing="xs">
                      <Group position="apart">
                        <Text weight={600}>{example.name}</Text>
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => loadExample(example)}
                        >
                          Load
                        </Button>
                      </Group>
                      <Text size="sm" color="dimmed">
                        {example.description}
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Paper>
        )}
      </Stack>

      {/* Help Modal */}
      <Modal
        opened={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Discover Query Help"
        size="lg"
      >
        <Stack spacing="md">
          <Text>
            Use the Discover Query Builder to explore your Sentry data with powerful
            queries.
          </Text>
          <Text weight={600}>Tips:</Text>
          <ul>
            <li>Start with simple queries and add complexity as needed</li>
            <li>Use aggregate functions like count(), avg(), and p95() for metrics</li>
            <li>Combine multiple fields to get detailed insights</li>
            <li>Use the natural language tab for quick query generation</li>
          </ul>
        </Stack>
      </Modal>
    </Box>
  );
};

export default QueryBuilder;
