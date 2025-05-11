import React, { useState, useEffect } from 'react';
import {
  Box,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack,
  Tabs,
  Autocomplete,
  Card,
  Text,
  Alert,
  LoadingOverlay,
  ActionIcon,
  Modal,
  Code,
  Table,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  IconSearch,
  IconFilter,
  IconCalendar,
  IconPlaystationX,
  IconPlus,
  IconAlertCircle,
  IconCode,
  IconWand,
  IconBookmark,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { discoverApi, FieldSuggestion, QueryExample } from '../../utils/api';
import { notifications } from '@mantine/notifications';

interface QueryBuilderProps {
  onExecute: (query: any) => void;
}

interface QueryFormData {
  query: string;
  fields: string[];
  sort?: string;
  limit?: number;
  project?: string[];
  environment?: string[];
  timeRange?: string;
  customTimeStart?: string;
  customTimeEnd?: string;
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({ onExecute }) => {
  const [activeTab, setActiveTab] = useState<string | null>('search');
  const [query, setQuery] = useState<QueryFormData>({
    query: '',
    fields: [],
    sort: '',
    limit: 100,
    project: [],
    environment: [],
    timeRange: '24h',
  });

  const [savedQueries, setSavedQueries] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState('');
  const [syntaxHelpOpen, setSyntaxHelpOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Fetch field suggestions
  const { data: fieldSuggestions = [], isLoading: loadingFields } = useQuery({
    queryKey: ['fieldSuggestions'],
    queryFn: () => discoverApi.getFieldSuggestions(),
  });

  // Fetch query examples
  const { data: queryExamples = [], isLoading: loadingExamples } = useQuery({
    queryKey: ['queryExamples'],
    queryFn: () => discoverApi.getQueryExamples(),
  });

  // Load saved queries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('discoverQueries');
    if (saved) {
      setSavedQueries(JSON.parse(saved));
    }
  }, []);

  const handleAddField = () => {
    if (selectedField && !query.fields.includes(selectedField)) {
      setQuery({
        ...query,
        fields: [...query.fields, selectedField],
      });
      setSelectedField('');
    }
  };

  const handleRemoveField = (field: string) => {
    setQuery({
      ...query,
      fields: query.fields.filter((f) => f !== field),
    });
  };

  const handleExecute = () => {
    if (!query.query.trim()) {
      notifications.show({
        title: 'Query required',
        message: 'Please enter a search query',
        color: 'red',
      });
      return;
    }

    const queryParams = {
      ...query,
      fields: query.fields.length > 0 ? query.fields : undefined,
      start: query.timeRange === 'custom' ? query.customTimeStart : undefined,
      end: query.timeRange === 'custom' ? query.customTimeEnd : undefined,
    };

    onExecute(queryParams);
  };

  const handleSaveQuery = () => {
    const name = prompt('Enter a name for this query:');
    if (name) {
      const newSavedQuery = {
        id: Date.now(),
        name,
        query: { ...query },
      };
      const updated = [...savedQueries, newSavedQuery];
      setSavedQueries(updated);
      localStorage.setItem('discoverQueries', JSON.stringify(updated));
      notifications.show({
        title: 'Query saved',
        message: `Query "${name}" has been saved`,
        color: 'green',
      });
    }
  };

  const handleLoadQuery = (savedQuery: any) => {
    setQuery(savedQuery.query);
    notifications.show({
      title: 'Query loaded',
      message: `Loaded query "${savedQuery.name}"`,
      color: 'blue',
    });
  };

  const handleDeleteQuery = (id: number) => {
    const updated = savedQueries.filter((q) => q.id !== id);
    setSavedQueries(updated);
    localStorage.setItem('discoverQueries', JSON.stringify(updated));
    notifications.show({
      title: 'Query deleted',
      message: 'Saved query has been deleted',
      color: 'red',
    });
  };

  const handleExampleClick = (example: QueryExample) => {
    setQuery({
      ...query,
      query: example.query,
    });
    setActiveTab('search');
  };

  return (
    <Stack gap="lg">
      {(loadingFields || loadingExamples) && <LoadingOverlay visible />}

      <Group justify="space-between">
        <Text size="lg" fw={700}>
          Build Your Query
        </Text>
        <Group>
          <Button
            leftSection={<IconWand size={16} />}
            onClick={() => setActiveTab('examples')}
          >
            Examples
          </Button>
          <Button
            leftSection={<IconBookmark size={16} />}
            variant="default"
            onClick={() => setActiveTab('saved')}
          >
            Saved Queries
          </Button>
          {activeTab === 'search' && (
            <Button
              leftSection={<IconPlaystationX size={16} />}
              variant="subtle"
              onClick={handleSaveQuery}
            >
              Save Query
            </Button>
          )}
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="search" leftSection={<IconSearch size={16} />}>
            Search Query
          </Tabs.Tab>
          <Tabs.Tab value="filters" leftSection={<IconFilter size={16} />}>
            Filters
          </Tabs.Tab>
          <Tabs.Tab value="examples" leftSection={<IconWand size={16} />}>
            Examples
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="search" pt="md">
          <Stack gap="md">
            {/* Main query input */}
            <Box>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={500}>Search Query</Text>
                  <Button
                    size="xs"
                    leftSection={<IconCode size={14} />}
                    onClick={() => setSyntaxHelpOpen(true)}
                  >
                    Syntax Help
                  </Button>
                </Group>
                {query.fields.map((field, index) => (
                  <Group key={index} gap="xs">
                    <Card withBorder p="xs" style={{ flex: 1 }}>
                      <Group justify="space-between">
                        <Text size="sm">{field}</Text>
                        <ActionIcon
                          color="red"
                          size="sm"
                          onClick={() => handleRemoveField(field)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  </Group>
                ))}
                <Group grow>
                  <Autocomplete
                    style={{ flex: 1 }}
                    placeholder="Select a field to add"
                    value={selectedField}
                    onChange={setSelectedField}
                    data={fieldSuggestions.map((f: FieldSuggestion) => ({
                      value: f.field,
                      label: `${f.field} (${f.type})`,
                    }))}
                  />
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={handleAddField}
                    disabled={!selectedField}
                  >
                    Add Field
                  </Button>
                </Group>
              </Stack>
            </Box>

            {/* Search query textarea */}
            <Stack gap="xs">
              <Text fw={500}>Query</Text>
              <Textarea
                placeholder="Enter your search query... (e.g., error.type:TypeError)"
                value={query.query}
                onChange={(e) => setQuery({ ...query, query: e.currentTarget.value })}
                autosize
                minRows={3}
              />
            </Stack>

            {/* Sort */}
            <Select
              label="Sort By"
              placeholder="Select sort field"
              value={query.sort}
              onChange={(value) => setQuery({ ...query, sort: value || '' })}
              data={[
                { value: '-timestamp', label: 'Newest First' },
                { value: 'timestamp', label: 'Oldest First' },
                { value: '-count', label: 'Most Frequent' },
                { value: 'count', label: 'Least Frequent' },
              ]}
            />

            {/* Limit */}
            <TextInput
              label="Limit"
              placeholder="Number of results"
              value={query.limit}
              onChange={(e) => setQuery({ ...query, limit: parseInt(e.currentTarget.value) || 100 })}
              type="number"
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="filters" pt="md">
          <Stack gap="md">
            {/* Time range */}
            <Select
              label="Time Range"
              value={query.timeRange}
              onChange={(value) => setQuery({ ...query, timeRange: value || '24h' })}
              leftSection={<IconCalendar size={16} />}
              data={[
                { value: '1h', label: 'Last 1 hour' },
                { value: '24h', label: 'Last 24 hours' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: 'custom', label: 'Custom range' },
              ]}
            />

            {query.timeRange === 'custom' && (
              <Group grow>
                <DateTimePicker
                  label="Start Date"
                  placeholder="Pick start date/time"
                  value={query.customTimeStart ? new Date(query.customTimeStart) : null}
                  onChange={(date) => setQuery({ 
                    ...query, 
                    customTimeStart: date?.toISOString() || ''
                  })}
                  leftSection={<IconCalendar size={16} />}
                />
                <DateTimePicker
                  label="End Date"
                  placeholder="Pick end date/time"
                  value={query.customTimeEnd ? new Date(query.customTimeEnd) : null}
                  onChange={(date) => setQuery({ 
                    ...query, 
                    customTimeEnd: date?.toISOString() || ''
                  })}
                  leftSection={<IconCalendar size={16} />}
                />
              </Group>
            )}

            {/* Additional filters can be added here */}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="examples" pt="md">
          {loadingExamples ? (
            <Text>Loading examples...</Text>
          ) : queryExamples.length > 0 ? (
            <Stack gap="md">
              <Text fw={500}>Query Examples</Text>
              {queryExamples.map((example: QueryExample) => (
                <Card
                  key={example.query}
                  withBorder
                  p="md"
                  onClick={() => handleExampleClick(example)}
                  style={{ cursor: 'pointer' }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={500}>{example.title}</Text>
                      <Text size="sm" c="dimmed">{example.category}</Text>
                    </Group>
                    <Text size="sm" c="dimmed">{example.description}</Text>
                    <Text size="xs" ff="monospace" c="blue">
                      {example.query}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="No examples available"
              color="blue"
            >
              Query examples are not available at this time.
            </Alert>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Action buttons */}
      <Group justify="flex-end">
        <Button variant="default" onClick={() => setQuery({
          query: '',
          fields: [],
          sort: '',
          limit: 100,
          project: [],
          environment: [],
          timeRange: '24h',
        })}>
          Clear
        </Button>
        <Button
          leftSection={<IconSearch size={16} />}
          onClick={handleExecute}
          loading={false}
          disabled={!query.query.trim()}
        >
          Execute Query
        </Button>
        <Button
          variant="subtle"
          onClick={() => setPreviewModalOpen(true)}
        >
          Preview Query
        </Button>
      </Group>

      {/* Saved queries modal/drawer would go here */}
      {activeTab === 'saved' && (
        <Stack gap="md">
          <Text fw={500}>Saved Queries</Text>
          {savedQueries.length > 0 ? (
            savedQueries.map((savedQuery) => (
              <Card key={savedQuery.id} withBorder p="md">
                <Group justify="space-between">
                  <Box style={{ flex: 1 }}>
                    <Text fw={500}>{savedQuery.name}</Text>
                    <Text size="sm" c="dimmed" ff="monospace">
                      {savedQuery.query.query}
                    </Text>
                  </Box>
                  <Group>
                    <Button
                      size="sm"
                      variant="light"
                      onClick={() => handleLoadQuery(savedQuery)}
                    >
                      Load
                    </Button>
                    <ActionIcon
                      color="red"
                      onClick={() => handleDeleteQuery(savedQuery.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              No saved queries yet. Execute a query and save it for later use.
            </Text>
          )}
        </Stack>
      )}
      
      {/* Query Preview Modal */}
      <Modal
        opened={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Query Preview"
        size="lg"
      >
        <Stack gap="md">
          <Text fw={500}>Generated Query Parameters</Text>
          <Code block>
            {JSON.stringify({
              ...query,
              fields: query.fields.length > 0 ? query.fields : undefined,
              start: query.timeRange === 'custom' ? query.customTimeStart : undefined,
              end: query.timeRange === 'custom' ? query.customTimeEnd : undefined,
            }, null, 2)}
          </Code>
          <Group justify="right">
            <Button onClick={() => setPreviewModalOpen(false)}>Close</Button>
            <Button onClick={() => {
              setPreviewModalOpen(false);
              handleExecute();
            }} color="blue">Execute Query</Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* Syntax Help Modal */}
      <Modal
        opened={syntaxHelpOpen}
        onClose={() => setSyntaxHelpOpen(false)}
        title="Query Syntax Help"
        size="lg"
      >
        <Stack gap="md">
          <Text fw={700} size="lg">Discover Query Syntax</Text>
          
          <Card withBorder>
            <Text fw={600} mb="xs">Basic Syntax</Text>
            <Text>
              Search for events containing specific terms or use key:value pairs to search specific fields.
            </Text>
            <Code block mt="sm">
              {`
# Search for any event with "error" in it
error

# Search for events with TypeError
error.type:TypeError

# Combine multiple conditions
error.type:TypeError project:frontend
              `}
            </Code>
          </Card>
          
          <Card withBorder>
            <Text fw={600} mb="xs">Operators</Text>
            <Stack gap="xs">
              <Text fw={500} size="sm">Comparison Operators</Text>
              <Table>
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Description</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>:</td>
                    <td>Equals</td>
                    <td>level:error</td>
                  </tr>
                  <tr>
                    <td>!</td>
                    <td>Not equals</td>
                    <td>!level:info</td>
                  </tr>
                  <tr>
                    <td>&gt;</td>
                    <td>Greater than</td>
                    <td>duration:&gt;1000</td>
                  </tr>
                  <tr>
                    <td>&lt;</td>
                    <td>Less than</td>
                    <td>duration:&lt;100</td>
                  </tr>
                  <tr>
                    <td>&gt;=</td>
                    <td>Greater than or equal</td>
                    <td>memory:&gt;=512</td>
                  </tr>
                  <tr>
                    <td>&lt;=</td>
                    <td>Less than or equal</td>
                    <td>memory:&lt;=1024</td>
                  </tr>
                </tbody>
              </Table>
            </Stack>
          </Card>
          
          <Card withBorder>
            <Text fw={600} mb="xs">Boolean Logic</Text>
            <Text>
              Combine search terms with AND, OR, and NOT operators.
            </Text>
            <Code block mt="sm">
              {`
# Events with errors AND from production environment
error AND environment:production

# Events with warnings OR errors
level:warning OR level:error

# All events except those from development
NOT environment:development
              `}
            </Code>
          </Card>
          
          <Card withBorder>
            <Text fw={600} mb="xs">Grouping</Text>
            <Text>
              Use parentheses to group expressions and control precedence.
            </Text>
            <Code block mt="sm">
              {`
# Events from production with errors or warnings
environment:production AND (level:error OR level:warning)
              `}
            </Code>
          </Card>
          
          <Button 
            mt="md" 
            fullWidth 
            onClick={() => setSyntaxHelpOpen(false)}
          >
            Close
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default QueryBuilder;