import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Stack,
  Paper,
  Text,
  Group,
  Button,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconSearch,
  IconChartBar,
  IconTable,
  IconBookmark,
  IconHistory,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import api from '../../utils/api';

import QueryBuilder from './QueryBuilder';
import ResultTable from './ResultTable';
import Visualizations from './Visualizations';

const DiscoverPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('query');
  const [currentQuery, setCurrentQuery] = useState(null);
  const [queryResults, setQueryResults] = useState(null);

  // Execute query mutation
  const executeQuery = useMutation(
    (query: any) => api.post('/api/discover/query', query),
    {
      onSuccess: (response) => {
        setQueryResults(response.data);
        setActiveTab('results');
        notifications.show({
          title: 'Query executed',
          message: `Found ${response.data.data.length} results`,
          color: 'green',
        });
      },
      onError: (error: any) => {
        notifications.show({
          title: 'Query failed',
          message: error.response?.data?.detail || 'Failed to execute query',
          color: 'red',
        });
      },
    }
  );

  const handleExecuteQuery = (query: any) => {
    setCurrentQuery(query);
    executeQuery.mutate(query);
  };

  const handleVisualize = (data: any) => {
    setActiveTab('visualizations');
  };

  return (
    <Box>
      <Stack spacing="lg">
        {/* Page Header */}
        <Paper p="md" withBorder>
          <Group position="apart">
            <div>
              <Text size="xl" weight={700}>
                Discover
              </Text>
              <Text size="sm" color="dimmed">
                Explore your Sentry data with powerful queries and visualizations
              </Text>
            </div>
            <Group>
              <Button
                variant="default"
                leftIcon={<IconHistory size={16} />}
                onClick={() => setActiveTab('history')}
              >
                History
              </Button>
              <Button
                variant="default"
                leftIcon={<IconBookmark size={16} />}
                onClick={() => setActiveTab('saved')}
              >
                Saved Queries
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Main Content Tabs */}
        <Paper withBorder>
          <Tabs value={activeTab} onTabChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="query" icon={<IconSearch size={14} />}>
                Query Builder
              </Tabs.Tab>
              <Tabs.Tab value="results" icon={<IconTable size={14} />}>
                Results
              </Tabs.Tab>
              <Tabs.Tab value="visualizations" icon={<IconChartBar size={14} />}>
                Visualizations
              </Tabs.Tab>
              <Tabs.Tab value="saved" icon={<IconBookmark size={14} />}>
                Saved Queries
              </Tabs.Tab>
              <Tabs.Tab value="history" icon={<IconHistory size={14} />}>
                History
              </Tabs.Tab>
            </Tabs.List>

            <Box p="md" style={{ position: 'relative' }}>
              <LoadingOverlay visible={executeQuery.isLoading} />

              <Tabs.Panel value="query">
                <QueryBuilder onExecute={handleExecuteQuery} />
              </Tabs.Panel>

              <Tabs.Panel value="results">
                {queryResults ? (
                  <ResultTable
                    query={currentQuery}
                    onExecute={() => executeQuery.mutate(currentQuery)}
                    onVisualize={handleVisualize}
                  />
                ) : (
                  <Box p="xl" style={{ textAlign: 'center' }}>
                    <Text color="dimmed">
                      Execute a query to see results here
                    </Text>
                  </Box>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="visualizations">
                {queryResults ? (
                  <Visualizations data={queryResults} query={currentQuery} />
                ) : (
                  <Box p="xl" style={{ textAlign: 'center' }}>
                    <Text color="dimmed">
                      Execute a query to visualize results
                    </Text>
                  </Box>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="saved">
                <SavedQueries onSelectQuery={handleExecuteQuery} />
              </Tabs.Panel>

              <Tabs.Panel value="history">
                <QueryHistory onSelectQuery={handleExecuteQuery} />
              </Tabs.Panel>
            </Box>
          </Tabs>
        </Paper>
      </Stack>
    </Box>
  );
};

// Sub-components
const SavedQueries: React.FC<{ onSelectQuery: (query: any) => void }> = ({
  onSelectQuery,
}) => {
  // Implementation for saved queries view
  return (
    <Box p="xl" style={{ textAlign: 'center' }}>
      <Text color="dimmed">Saved queries functionality to be implemented</Text>
    </Box>
  );
};

const QueryHistory: React.FC<{ onSelectQuery: (query: any) => void }> = ({
  onSelectQuery,
}) => {
  // Implementation for query history view
  return (
    <Box p="xl" style={{ textAlign: 'center' }}>
      <Text color="dimmed">Query history functionality to be implemented</Text>
    </Box>
  );
};

export default DiscoverPage;
