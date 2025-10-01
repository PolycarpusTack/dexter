import React, { useState, useEffect } from 'react';
import { Alert, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { testApiConnection } from '../api/unified/apiConnectionTest';

const ApiConnectionStatus = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runConnectionTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const connectionResults = await testApiConnection();
      setResults(connectionResults);
    } catch (err: any) {
      setError(err.message || 'Failed to run connection test');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  return (
    <Card withBorder p="lg" radius="md" shadow="sm">
      <Title order={3} mb="md">API Connection Status</Title>
      
      {loading && (
        <Group>
          <Loader size="sm" />
          <Text>Testing API connection...</Text>
        </Group>
      )}
      
      {error && (
        <Alert color="red" title="Error running test">
          {error}
        </Alert>
      )}
      
      {results && (
        <Stack spacing="xs">
          <Alert 
            color={results.reachable ? "green" : "red"} 
            title={results.reachable ? "API Server Reachable" : "API Server Unreachable"}
          >
            {results.reachable ? 
              `Successfully connected to API at ${results.baseUrl}` : 
              (results.error || `Failed to connect to API at ${results.baseUrl}`)}
          </Alert>
          
          {results.reachable && (
            <>
              <Text fw={500}>Endpoint Status:</Text>
              <Group spacing="md">
                <Text>Status Endpoint: {results.statusEndpoint ? '✅' : '❌'}</Text>
                <Text>Config Endpoint: {results.configEndpoint ? '✅' : '❌'}</Text>
                <Text>Events Endpoint: {results.eventsEndpoint ? '✅' : '❌'}</Text>
              </Group>
              
              {!results.statusEndpoint && !results.configEndpoint && !results.eventsEndpoint && (
                <Alert color="orange" title="API Endpoints Not Found">
                  The server is reachable but the API endpoints are not responding. This may indicate:
                  <ul>
                    <li>The API is running but at a different base path</li>
                    <li>The backend server is not a Dexter API server</li>
                    <li>The backend server is not fully initialized</li>
                  </ul>
                </Alert>
              )}
            </>
          )}
          
          {!results.reachable && (
            <Alert color="orange" title="Backend Server Not Running">
              Make sure your backend server is running with:
              <code style={{ display: 'block', marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5' }}>
                cd backend<br />
                uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
              </code>
            </Alert>
          )}
        </Stack>
      )}
      
      <Group position="right" mt="md">
        <Button onClick={runConnectionTest} loading={loading}>
          {loading ? 'Testing...' : 'Test Connection Again'}
        </Button>
      </Group>
    </Card>
  );
};

export default ApiConnectionStatus;