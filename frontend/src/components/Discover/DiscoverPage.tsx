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
import { discoverApi } from '../../utils/api';

import QueryBuilder from './QueryBuilder';
import ResultTable from './ResultTable';
import Visualizations from './Visualizations';

const DiscoverPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('query');
  const [currentQuery, setCurrentQuery] = useState<any>(null);
  const [queryResults, setQueryResults] = useState<any>(null);

  // Execute query mutation
  const executeQuery = useMutation({
    mutationFn: (query: any) => discoverApi.query(query),
    onSuccess: (response) => {
      setQueryResults(response);
      setActiveTab('results');
      notifications.show({
        title: 'Query executed',
        message: `Found ${response.data.length} results`,
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
  });

  const handleExecuteQuery = (query: any) => {
    setCurrentQuery(query);
    executeQuery.mutate(query);
  };

  const handleVisualize = (_data: any) => {
    setActiveTab('visualizations');
  };

  return (
    <Box>
      <Stack>
        {/* Page Header */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xl" fw={700}>
                Discover
              </Text>
              <Text size="sm" c="dimmed">
                Explore your Sentry data with powerful queries and visualizations
              </Text>
            </div>
            <Group>
              <Button
                variant="default"
                leftSection={<IconHistory size={16} />}
                onClick={() => setActiveTab('history')}
              >
                History
              </Button>
              <Button
                variant="default"
                leftSection={<IconBookmark size={16} />}
                onClick={() => setActiveTab('saved')}
              >
                Saved Queries
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Main Content Tabs */}
        <Paper withBorder>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="query" leftSection={<IconSearch size={14} />}>
                Query Builder
              </Tabs.Tab>
              <Tabs.Tab value="results" leftSection={<IconTable size={14} />}>
                Results
              </Tabs.Tab>
              <Tabs.Tab value="visualizations" leftSection={<IconChartBar size={14} />}>
                Visualizations
              </Tabs.Tab>
              <Tabs.Tab value="saved" leftSection={<IconBookmark size={14} />}>
                Saved Queries
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory size={14} />}>
                History
              </Tabs.Tab>
            </Tabs.List>

            <Box p="md" style={{ position: 'relative' }}>
              <LoadingOverlay visible={executeQuery.isPending} />

              <Tabs.Panel value="query">
                <QueryBuilder onExecute={handleExecuteQuery} />
              </Tabs.Panel>

              <Tabs.Panel value="results">
                {queryResults ? (
                  <ResultTable
                    query={currentQuery}
                    onExecute={() => {
                      if (currentQuery) {
                        executeQuery.mutate(currentQuery);
                      } else {
                        console.warn('No query to execute');
                      }
                    }}
                    onVisualize={handleVisualize}
                  />
                ) : (
                  <Box p="xl" style={{ textAlign: 'center' }}>
                    <Text c="dimmed">
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
                    <Text c="dimmed">
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
  onSelectQuery: _onSelectQuery,
}) => {
  // Implementation for saved queries view
  // TODO: Use onSelectQuery when implemented
  return (
    <Box p="xl" style={{ textAlign: 'center' }}>
      <Text c="dimmed">Saved queries functionality to be implemented</Text>
    </Box>
  );
};

const QueryHistory: React.FC<{ onSelectQuery: (query: any) => void }> = ({
  onSelectQuery: _onSelectQuery,
}) => {
  // Implementation for query history view
  // TODO: Use onSelectQuery when implemented
  return (
    <Box p="xl" style={{ textAlign: 'center' }}>
      <Text c="dimmed">Query history functionality to be implemented</Text>
    </Box>
  );
};

export default DiscoverPage;
