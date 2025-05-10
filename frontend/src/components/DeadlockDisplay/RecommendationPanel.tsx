// frontend/src/components/DeadlockDisplay/RecommendationPanel.tsx

import React from 'react';
import { 
  Paper, 
  Text, 
  Loader, 
  useMantineTheme, 
  Group,
  Badge,
  Tabs,
  Stack,
  Alert,
  Box,
  Code,
  Divider,
  ThemeIcon,
  List,
  Card,
  Button,
  Tooltip,
  Accordion,
  Title,
  TypographyStylesProvider
} from '@mantine/core';
import { 
  IconInfoCircle, 
  IconBulb, 
  IconTools, 
  IconAlertTriangle,
  IconCode,
  IconArrowRight,
  IconBook,
  IconDatabase,
  IconDatabaseOff,
  IconClock,
  IconLock,
  IconExclamationCircle,
  IconCheck
} from '@tabler/icons-react';
import { DeadlockVisualizationData } from '../../types/deadlock';

interface RecommendationPanelProps {
  data?: DeadlockVisualizationData & {
    recommendedFix?: string;
    severity?: number;
    cycles?: string[][];
    pattern?: string;
    nodes?: Array<{
      id: string | number;
      type: string;
      label: string;
      inCycle?: boolean;
    }>;
  } | null;
  isLoading: boolean;
  isMasked?: boolean;
}

/**
 * Displays recommendations and solutions for resolving deadlocks
 */
const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ 
  data, 
  isLoading,
  isMasked = false
}) => {
  const theme = useMantineTheme();
  
  if (isLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 50, paddingBottom: 50 }}>
        <Loader />
      </Box>
    );
  }
  
  if (!data) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', paddingTop: 50, paddingBottom: 50 }}>
        <Group>
          <IconDatabaseOff size={20} />
          <Text c="dimmed">No deadlock data available</Text>
        </Group>
      </Box>
    );
  }
  
  // Extract recommendation from data
  const recommendation = data.recommendedFix || '';
  
  // Extract deadlock severity if available
  const severity = data.severity || 0;
  
  // Get severity level
  const getSeverityLevel = (score: number) => {
    if (score < 30) return { color: 'green', label: 'Low' };
    if (score < 60) return { color: 'yellow', label: 'Medium' };
    return { color: 'red', label: 'High' };
  };
  
  const severityInfo = getSeverityLevel(severity);
  
  // Extract cycles and pattern info
  const cycles = data.cycles || [];
  const pattern = data.pattern || 'Unknown deadlock pattern';
  
  // Extract involved tables
  const involvedTables = data.nodes ? 
    data.nodes
      .filter(node => node.type === 'table' && node.inCycle)
      .map(node => node.label) : 
    [];
  
  // Extract involved processes
  const involvedProcesses = data.nodes ? 
    data.nodes
      .filter(node => node.type === 'process' && node.inCycle)
      .map(node => node.label) : 
    [];
  
  return (
    <Stack gap="md">
      {/* Recommendation overview */}
      <Paper p="md" withBorder radius="md">
        <Group justify="apart" mb="md">
          <Group>
            <ThemeIcon size="lg" radius="md" color={severityInfo.color}>
              <IconAlertTriangle size={18} />
            </ThemeIcon>
            <Text fw={600}>Deadlock Analysis</Text>
          </Group>
          <Group>
            <Badge color={severityInfo.color} size="lg">
              {severityInfo.label} Risk
            </Badge>
            <Tooltip label="Analysis completed">
              <Badge color="green" variant="outline" size="lg" leftSection={<IconCheck size={12} />}>
                Analyzed
              </Badge>
            </Tooltip>
          </Group>
        </Group>
        
        {pattern && (
          <Alert 
            icon={<IconLock size={16} />} 
            color="blue" 
            mb="md"
            title={isMasked ? "Deadlock Pattern Identified (Masked)" : "Deadlock Pattern Identified"}
          >
            <Text size="sm">{isMasked ? "Pattern details masked" : pattern}</Text>
          </Alert>
        )}
        
        <Text size="sm" mb="md">
          This deadlock involves {involvedProcesses.length} process{involvedProcesses.length !== 1 ? 'es' : ''} and {involvedTables.length} table{involvedTables.length !== 1 ? 's' : ''}.
          {isMasked && <Text size="xs" c="dimmed" mt="xs">Note: Sensitive information is masked for security reasons.</Text>}
        </Text>
        
        {/* Involved processes summary */}
        <Box mb="md">
          <Text fw={600} size="sm" mb="xs">Processes Involved:</Text>
          <List size="sm" spacing="xs">
            {involvedProcesses.map((process, idx) => (
              <List.Item key={idx}>{process}</List.Item>
            ))}
          </List>
        </Box>
        
        {/* Involved tables summary */}
        <Box mb="md">
          <Text fw={600} size="sm" mb="xs">Tables Involved:</Text>
          <List size="sm">
            {involvedTables.map((table, idx) => (
              <List.Item key={idx}>{table}</List.Item>
            ))}
          </List>
        </Box>
        
        <Divider my="sm" />
        
        {/* Deadlock cycles if available */}
        {cycles.length > 0 && (
          <Box mb="md">
            <Group gap="xs" mb="xs">
              <IconClock size={16} color={theme.colors.orange[6]} />
              <Text fw={600} size="sm">Deadlock Cycle{cycles.length > 1 ? 's' : ''}:</Text>
            </Group>
            <Accordion>
              {cycles.map((cycle, idx) => (
                <Accordion.Item key={idx} value={`cycle-${idx}`}>
                  <Accordion.Control>
                    <Group>
                      <IconExclamationCircle size={16} color={theme.colors.red[6]} />
                      <Text>Cycle {idx + 1}</Text>
                      <Badge size="xs">{cycle.length} steps</Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <List size="sm" type="ordered">
                      {cycle.map((step, stepIdx) => (
                        <List.Item key={stepIdx}>
                          {step}
                        </List.Item>
                      ))}
                    </List>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Box>
        )}
      </Paper>
      
      {/* Recommendations detail */}
      <Paper p="md" withBorder radius="md">
        <Title order={4} mb="md">
          <Group gap="xs">
            <IconBulb size={20} />
            <Text>Recommended Solution</Text>
            <Tooltip label="AI-generated recommendation" withArrow>
              <Button size="xs" leftSection={<IconInfoCircle size={12} />} variant="subtle">
                AI Assisted
              </Button>
            </Tooltip>
          </Group>
        </Title>
        
        {!recommendation ? (
          <Alert 
            icon={<IconInfoCircle size={16} />} 
            color="blue"
          >
            No specific recommendation is available for this deadlock pattern.
            Please see the general deadlock prevention guidelines below.
          </Alert>
        ) : (
          <TypographyStylesProvider>
            <div dangerouslySetInnerHTML={{ __html: recommendation }} />
          </TypographyStylesProvider>
        )}
      </Paper>
      
      {/* General guidelines */}
      <Paper p="md" withBorder radius="md">
        <Title order={4} mb="md">
          <Group gap="xs">
            <IconTools size={20} />
            <Text>General Deadlock Prevention Guidelines</Text>
          </Group>
        </Title>
        
        <Tabs defaultValue="patterns">
          <Tabs.List mb="md">
            <Tabs.Tab 
              value="patterns" 
              leftSection={<IconDatabase size={14} />}
            >
              Common Patterns
            </Tabs.Tab>
            <Tabs.Tab 
              value="code" 
              leftSection={<IconCode size={14} />}
            >
              Code Practices
            </Tabs.Tab>
            <Tabs.Tab 
              value="docs" 
              leftSection={<IconBook size={14} />}
            >
              Documentation
            </Tabs.Tab>
          </Tabs.List>
          
          <Tabs.Panel value="patterns">
            <Stack gap="md">
              <Alert 
                icon={<IconInfoCircle size={16} />} 
                color="blue" 
                title="Common Deadlock Patterns" 
                mb="md"
              >
                Recognizing these patterns can help you avoid deadlocks in your applications.
              </Alert>
              
              <Card shadow="sm" p="lg" radius="md" withBorder mb="sm">
                <Card.Section bg={theme.colors.red[0]} p="sm">
                  <Group justify="apart">
                    <Text fw={600}>Cycle of Waiting</Text>
                    <Badge color="red">Most Common</Badge>
                  </Group>
                </Card.Section>
                <Text size="sm" mt="md">
                  Process A holds a lock on resource 1 and waits for resource 2, while Process B holds resource 2 and waits for resource 1. This circular dependency causes both processes to wait indefinitely.
                </Text>
                <Text size="sm" mt="md" fw={600}>Solution:</Text>
                <Text size="sm">
                  Ensure consistent access order. Always acquire locks in the same order across all transactions to prevent circular wait conditions.
                </Text>
              </Card>
              
              <Card shadow="sm" p="lg" radius="md" withBorder mb="sm">
                <Card.Section bg={theme.colors.orange[0]} p="sm">
                  <Text fw={600}>Lock Escalation</Text>
                </Card.Section>
                <Text size="sm" mt="md">
                  A transaction starts with a shared lock but later needs to upgrade to an exclusive lock. If another transaction has acquired a shared lock in the meantime, the lock escalation may deadlock.
                </Text>
                <Text size="sm" mt="md" fw={600}>Solution:</Text>
                <Text size="sm">
                  Acquire the most restrictive lock needed at the beginning of a transaction, rather than escalating locks mid-transaction.
                </Text>
              </Card>
              
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Card.Section bg={theme.colors.yellow[0]} p="sm">
                  <Text fw={600}>Multi-Statement Transactions</Text>
                </Card.Section>
                <Text size="sm" mt="md">
                  Long-running transactions hold locks for extended periods, increasing the chance of conflicts with other transactions.
                </Text>
                <Text size="sm" mt="md" fw={600}>Solution:</Text>
                <Text size="sm">
                  Keep transactions short and focused. Break large operations into smaller transactions when possible.
                </Text>
              </Card>
            </Stack>
          </Tabs.Panel>
          
          <Tabs.Panel value="code">
            <Stack gap="md">
              <Alert 
                icon={<IconInfoCircle size={16} />} 
                color="blue" 
                title="Code Best Practices" 
                mb="md"
              >
                These coding practices can significantly reduce deadlock risk in your applications.
              </Alert>
              
              <Box>
                <Text fw={600} mb="xs">1. Consistent Lock Ordering</Text>
                <Code block>
{`-- Good practice: Consistent ordering
BEGIN;
-- Always access smaller ID first
SELECT * FROM users WHERE id = 101 FOR UPDATE;
SELECT * FROM users WHERE id = 201 FOR UPDATE;
COMMIT;

-- Another transaction follows same order
BEGIN;
SELECT * FROM users WHERE id = 101 FOR UPDATE;
SELECT * FROM users WHERE id = 201 FOR UPDATE;
COMMIT;`}
                </Code>
              </Box>
              
              <Box>
                <Text fw={600} mb="xs">2. Use Appropriate Lock Modes</Text>
                <Code block>
{`-- Good practice: Use least restrictive lock mode needed
BEGIN;
-- Using FOR SHARE instead of FOR UPDATE when not modifying
SELECT * FROM products WHERE id = 123 FOR SHARE;
-- Additional logic here
COMMIT;`}
                </Code>
              </Box>
              
              <Box>
                <Text fw={600} mb="xs">3. Keep Transactions Short</Text>
                <Code block>
{`-- BAD practice: Long transaction with external calls
BEGIN;
SELECT * FROM orders WHERE id = 345 FOR UPDATE;
-- Don't make API calls or slow operations here
PERFORM http_request('https://api.example.com/check');
-- Lots of additional processing
UPDATE orders SET status = 'processed' WHERE id = 345;
COMMIT;

-- GOOD practice: Focused transaction
BEGIN;
SELECT * FROM orders WHERE id = 345 FOR UPDATE;
UPDATE orders SET status = 'processing' WHERE id = 345;
COMMIT;

-- External operations outside transaction
PERFORM http_request('https://api.example.com/check');

-- Second transaction if needed
BEGIN;
UPDATE orders SET status = 'processed' WHERE id = 345;
COMMIT;`}
                </Code>
              </Box>
              
              <Box>
                <Text fw={600} mb="xs">4. Use NOWAIT or Timeout</Text>
                <Code block>
{`-- Using NOWAIT to avoid waiting indefinitely
BEGIN;
-- Will error immediately instead of waiting if lock not available
SELECT * FROM inventory WHERE product_id = 123 FOR UPDATE NOWAIT;
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 123;
COMMIT;

-- Alternative with timeout
BEGIN;
-- Will wait for up to 3 seconds
SELECT * FROM inventory WHERE product_id = 123 FOR UPDATE SET LOCK_TIMEOUT 3000;
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 123;
COMMIT;`}
                </Code>
              </Box>
            </Stack>
          </Tabs.Panel>
          
          <Tabs.Panel value="docs">
            <Stack gap="md">
              <Alert 
                icon={<IconInfoCircle size={16} />} 
                color="blue" 
                title="Documentation References" 
                mb="md"
              >
                These resources provide in-depth information about PostgreSQL locking and deadlock prevention.
              </Alert>
              
              <Box>
                <Text fw={600}>PostgreSQL Official Documentation</Text>
                <List size="sm" spacing="xs" mt="xs">
                  <List.Item>
                    <Group gap="xs">
                      <IconBook size={14} />
                      <Text>
                        <a href="https://www.postgresql.org/docs/current/explicit-locking.html" target="_blank" rel="noopener noreferrer">
                          Explicit Locking <IconArrowRight size={12} color={theme.colors.gray[5]} style={{ verticalAlign: 'middle' }} />
                        </a>
                      </Text>
                    </Group>
                  </List.Item>
                  <List.Item>
                    <Group gap="xs">
                      <IconBook size={14} />
                      <Text>
                        <a href="https://www.postgresql.org/docs/current/transaction-iso.html" target="_blank" rel="noopener noreferrer">
                          Transaction Isolation
                        </a>
                      </Text>
                    </Group>
                  </List.Item>
                  <List.Item>
                    <Group gap="xs">
                      <IconBook size={14} />
                      <Text>
                        <a href="https://www.postgresql.org/docs/current/view-pg-locks.html" target="_blank" rel="noopener noreferrer">
                          pg_locks System View
                        </a>
                      </Text>
                    </Group>
                  </List.Item>
                </List>
              </Box>
              
              <Box>
                <Text fw={600}>External Resources</Text>
                <List size="sm" spacing="xs" mt="xs">
                  <List.Item>
                    <Group gap="xs">
                      <IconBook size={14} />
                      <Text>
                        <a href="https://wiki.postgresql.org/wiki/Lock_Monitoring" target="_blank" rel="noopener noreferrer">
                          PostgreSQL Wiki: Lock Monitoring
                        </a>
                      </Text>
                    </Group>
                  </List.Item>
                  <List.Item>
                    <Group gap="xs">
                      <IconBook size={14} />
                      <Text>
                        <a href="https://www.2ndquadrant.com/en/blog/postgresql-deadlocks-part-1/" target="_blank" rel="noopener noreferrer">
                          Understanding PostgreSQL Deadlocks (2ndQuadrant)
                        </a>
                      </Text>
                    </Group>
                  </List.Item>
                </List>
              </Box>
              
              <Box>
                <Text fw={600}>Debugging Tools</Text>
                <List size="sm" spacing="xs" mt="xs">
                  <List.Item>
                    <Group gap="xs">
                      <IconTools size={14} />
                      <Text>
                        <a href="https://github.com/pganalyze/pg_query" target="_blank" rel="noopener noreferrer">
                          pg_query - PostgreSQL parser for Ruby
                        </a>
                      </Text>
                    </Group>
                  </List.Item>
                  <List.Item>
                    <Group gap="xs">
                      <IconTools size={14} />
                      <Text>
                        <a href="https://github.com/adjust/pglockanalyze" target="_blank" rel="noopener noreferrer">
                          pglockanalyze - Lock monitoring extension
                        </a>
                      </Text>
                    </Group>
                  </List.Item>
                </List>
              </Box>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  );
};

export default RecommendationPanel;
