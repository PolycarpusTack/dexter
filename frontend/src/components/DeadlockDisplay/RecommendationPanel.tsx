import React, { useState } from 'react';
import { 
  Paper, 
  Text, 
  Group, 
  Skeleton, 
  Button,
  Divider,
  Box,
  List,
  Code,
  Accordion,
  ThemeIcon,
  Badge,
  Tabs,
  Avatar,
  useMantineTheme
} from '@mantine/core';
import { 
  IconBulb, 
  IconClipboard, 
  IconCheck, 
  IconDatabase,
  IconCode,
  IconListSearch,
  IconArrowDown,
  IconAlertCircle,
  IconSquarePlus,
  IconBook2
} from '@tabler/icons-react';

// Import hooks
import { useClipboard } from '../../hooks';

// Define the types for props and data
interface Process {
  pid: number;
  applicationName?: string;
  username?: string;
  databaseName?: string;
  query?: string;
  blockingPids?: number[];
  waitEventType?: string;
  waitEvent?: string;
  tableName?: string;
  relation?: number;
  lockType?: string;
  lockMode?: string;
  inCycle?: boolean;
}

interface Relation {
  relationId: number;
  schema?: string;
  name?: string;
  lockingProcesses?: number[];
}

interface RecommendationPanelProps {
  data?: {
    processes?: Process[];
    relations?: Relation[];
    deadlockChain?: number[];
    pattern?: string;
    recommendedFix?: string;
  };
  isLoading: boolean;
  isMasked?: boolean;
  maskText?: (text: string | undefined) => string;
}

/**
 * Component for displaying deadlock resolution recommendations
 */
const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ 
  data, 
  isLoading,
  isMasked = false,
  maskText = (text) => text || ''
}) => {
  const theme = useMantineTheme();
  const { isCopied, copyToClipboard } = useClipboard();
  const [activeTab, setActiveTab] = useState<string | null>('recommendation');
  
  // Generate a recommended fix if not provided
  const recommendedFix = React.useMemo(() => {
    if (data?.recommendedFix) {
      return isMasked ? maskText(data.recommendedFix) : data.recommendedFix;
    }
    
    // Generate a basic recommendation if none is provided
    if (data?.processes && data.relations) {
      const tableNames = data.relations.map(r => `${r.schema ? `${r.schema}.` : ''}${r.name}`).filter(Boolean);
      
      let recommendation = 'Based on the deadlock pattern detected, consider the following recommendations:\n\n';
      
      // Add transaction ordering recommendation
      recommendation += '1. **Consistent Transaction Ordering**: Ensure that transactions access tables in a consistent order. ';
      if (tableNames.length > 1) {
        recommendation += `For example, always access tables in this order: ${tableNames.join(' → ')}.\n\n`;
      } else {
        recommendation += 'This prevents circular wait conditions.\n\n';
      }
      
      // Add index recommendation if applicable
      recommendation += '2. **Review Indexing**: Ensure proper indexes exist for the queries involved in the deadlock. ';
      recommendation += 'Missing indexes can cause table scans that lead to excessive locking.\n\n';
      
      // Add transaction size recommendation
      recommendation += '3. **Reduce Transaction Size**: Break large transactions into smaller ones to reduce lock duration. ';
      recommendation += 'Only include the minimum necessary operations in each transaction.\n\n';
      
      // Add application-level locking recommendation
      recommendation += '4. **Consider Application-Level Locking**: For high-contention scenarios, implement application-level ';
      recommendation += 'locking or queueing mechanisms to manage access to critical resources.\n\n';
      
      // Add monitoring recommendation
      recommendation += '5. **Monitor Lock Contention**: Regularly monitor for lock contention patterns using pg_stat_activity ';
      recommendation += 'and implement alerts for long-running transactions.';
      
      return recommendation;
    }
    
    return 'Unable to generate recommendations due to insufficient data. Please check the detailed deadlock information.';
  }, [data?.recommendedFix, data?.processes, data?.relations, isMasked, maskText]);
  
  // Handle copy to clipboard
  const handleCopyRecommendation = () => {
    if (recommendedFix) {
      copyToClipboard(recommendedFix, {
        successMessage: 'Recommendation copied to clipboard',
        errorMessage: 'Failed to copy recommendation'
      });
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div>
        <Skeleton height={30} width="50%" mb="md" />
        <Skeleton height={200} mb="md" />
        <Skeleton height={15} width="80%" mb="sm" />
        <Skeleton height={15} width="60%" mb="sm" />
        <Skeleton height={15} width="70%" />
      </div>
    );
  }
  
  // No data state
  if (!data || !data.processes || data.processes.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Group spacing="xs" mb="md">
          <IconAlertCircle size={18} />
          <Text>No recommendation available</Text>
        </Group>
        <Text size="sm" color="dimmed">
          The server was unable to provide recommendations for this deadlock.
          This could be due to limited information in the original error message or
          an unsupported deadlock pattern.
        </Text>
      </Paper>
    );
  }
  
  // Pattern detection
  let patternType = data.pattern || 'unknown';
  let patternDescription = '';
  
  switch (patternType) {
    case 'update-update':
      patternDescription = 'Two or more transactions updating the same rows in reverse order';
      break;
    case 'insert-select':
      patternDescription = 'Inserts conflicting with selects holding share locks';
      break;
    case 'foreign-key':
      patternDescription = 'Deadlock involving foreign key constraints';
      break;
    case 'multiple-table':
      patternDescription = 'Transactions accessing multiple tables in different orders';
      break;
    default:
      patternDescription = 'Complex or unclassified deadlock pattern';
      break;
  }
  
  return (
    <div>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab 
            value="recommendation" 
            leftSection={<IconBulb size={14} />}
          >
            Recommendations
          </Tabs.Tab>
          
          <Tabs.Tab 
            value="pattern" 
            leftSection={<IconListSearch size={14} />}
          >
            Deadlock Pattern
          </Tabs.Tab>
          
          <Tabs.Tab 
            value="examples" 
            leftSection={<IconCode size={14} />}
          >
            Code Examples
          </Tabs.Tab>
        </Tabs.List>
        
        <Box mt="md">
          {activeTab === 'recommendation' && (
            <Paper p="md" withBorder>
              <Group position="apart" mb="md">
                <Group spacing="xs">
                  <IconBulb size={18} color={theme.colors.yellow[6]} />
                  <Text fw={600}>Recommended Resolution</Text>
                </Group>
                
                <Button
                  size="xs"
                  variant="light"
                  leftSection={isCopied ? <IconCheck size={14} /> : <IconClipboard size={14} />}
                  onClick={handleCopyRecommendation}
                  color={isCopied ? 'green' : 'blue'}
                >
                  {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
              </Group>
              
              <Divider mb="md" />
              
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                marginBottom: '20px',
                fontFamily: theme.fontFamily
              }}>
                {recommendedFix.split('\n').map((line, index) => {
                  // Convert markdown-style headers
                  if (line.startsWith('# ')) {
                    return <Text key={index} size="xl" fw={700} mb="xs">{line.substring(2)}</Text>;
                  } else if (line.startsWith('## ')) {
                    return <Text key={index} size="lg" fw={700} mb="xs">{line.substring(3)}</Text>;
                  } else if (line.startsWith('### ')) {
                    return <Text key={index} size="md" fw={700} mb="xs">{line.substring(4)}</Text>;
                  }
                  
                  // Convert markdown-style bold
                  const boldPattern = /\*\*([^*]+)\*\*/g;
                  const lineWithBold = line.replace(boldPattern, '<strong>$1</strong>');
                  
                  // Empty lines become margin
                  if (line.trim() === '') {
                    return <Box key={index} mb="md" />;
                  }
                  
                  // Regular lines
                  return (
                    <Text key={index} mb="xs" dangerouslySetInnerHTML={{ __html: lineWithBold }} />
                  );
                })}
              </div>
              
              {/* Additional resources */}
              <Accordion variant="separated" mt="xl">
                <Accordion.Item value="additional">
                  <Accordion.Control icon={<IconBook2 size={16} />}>
                    <Text fw={500}>Additional Resources</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <List spacing="sm">
                      <List.Item>
                        <Text component="a" href="https://www.postgresql.org/docs/current/explicit-locking.html" target="_blank" rel="noopener noreferrer">
                          PostgreSQL Documentation: Explicit Locking
                        </Text>
                      </List.Item>
                      <List.Item>
                        <Text component="a" href="https://www.postgresql.org/docs/current/transaction-iso.html" target="_blank" rel="noopener noreferrer">
                          PostgreSQL Documentation: Transaction Isolation
                        </Text>
                      </List.Item>
                      <List.Item>
                        <Text component="a" href="https://www.postgresql.org/docs/current/monitoring-stats.html" target="_blank" rel="noopener noreferrer">
                          PostgreSQL Documentation: Monitoring Database Activity
                        </Text>
                      </List.Item>
                    </List>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Paper>
          )}
          
          {activeTab === 'pattern' && (
            <Paper p="md" withBorder>
              <Group position="apart" mb="md">
                <Group spacing="xs">
                  <IconListSearch size={18} />
                  <Text fw={600}>Deadlock Pattern Analysis</Text>
                </Group>
                <Badge size="sm" color="blue">{patternType}</Badge>
              </Group>
              
              <Divider mb="md" />
              
              <Text mb="lg">{patternDescription}</Text>
              
              <Text fw={500} mb="sm">Detected Pattern:</Text>
              
              <Box
                p="md"
                style={{
                  backgroundColor: theme.fn.rgba(theme.colors.blue[1], 0.5),
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.blue[3]}`,
                  marginBottom: '20px'
                }}
              >
                <Group position="apart" mb="xs">
                  <Text size="sm" fw={500}>Process Chain</Text>
                  <Badge size="xs" color="blue">{data.deadlockChain?.length || 0} processes</Badge>
                </Group>
                
                <Group spacing="xs" mb="md">
                  {data.deadlockChain?.map((pid, index) => (
                    <React.Fragment key={pid}>
                      <Badge size="md">{pid}</Badge>
                      {index < (data.deadlockChain?.length || 0) - 1 && (
                        <IconArrowDown size={14} />
                      )}
                    </React.Fragment>
                  ))}
                  {/* Show circular reference if it's a cycle */}
                  {(data.deadlockChain?.length || 0) > 1 && (
                    <>
                      <IconArrowDown size={14} />
                      <Badge size="md">{data.deadlockChain?.[0]}</Badge>
                    </>
                  )}
                </Group>
                
                {data.processes?.filter(p => p.inCycle).map(process => (
                  <Box
                    key={process.pid}
                    mb="md"
                    p="xs"
                    style={{
                      backgroundColor: theme.white,
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.colors.gray[3]}`
                    }}
                  >
                    <Group spacing="xs" mb="xs">
                      <Avatar size="sm" color="blue" radius="xl">
                        {process.pid}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={500}>Process {process.pid}</Text>
                        <Text size="xs" color="dimmed">{process.applicationName}</Text>
                      </div>
                    </Group>
                    
                    <Text size="xs" mb="xs" fw={500}>Query:</Text>
                    <Code block style={{ marginBottom: '10px', fontSize: '12px' }}>
                      {isMasked ? maskText(process.query) : process.query}
                    </Code>
                    
                    <Group spacing="xs">
                      <Text size="xs" fw={500}>Waiting for:</Text>
                      <Text size="xs">{process.waitEvent}</Text>
                    </Group>
                    
                    <Group spacing="xs">
                      <Text size="xs" fw={500}>Blocking PIDs:</Text>
                      {process.blockingPids?.map(pid => (
                        <Badge key={pid} size="xs">{pid}</Badge>
                      ))}
                    </Group>
                  </Box>
                ))}
              </Box>
              
              <Text fw={500} mb="sm">Pattern Analysis:</Text>
              
              <Box mb="md">
                <Accordion>
                  <Accordion.Item value="root-cause">
                    <Accordion.Control icon={<IconAlertCircle size={16} color={theme.colors.red[6]} />}>
                      <Text fw={500}>Root Cause</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text mb="md">
                        This deadlock occurred due to {
                          patternType === 'update-update' ? 'concurrent updates to the same rows in different orders' :
                          patternType === 'insert-select' ? 'conflicts between inserts and selects with share locks' :
                          patternType === 'foreign-key' ? 'cascading operations involving foreign key constraints' :
                          patternType === 'multiple-table' ? 'transactions accessing multiple tables in different orders' :
                          'a complex interaction pattern between multiple transactions'
                        }.
                      </Text>
                      
                      {data.relations && data.relations.length > 0 && (
                        <>
                          <Text fw={500} mb="xs">Tables Involved:</Text>
                          <List>
                            {data.relations.map(relation => (
                              <List.Item key={relation.relationId}>
                                <Text size="sm">
                                  {relation.schema ? `${relation.schema}.` : ''}{relation.name} (ID: {relation.relationId})
                                </Text>
                              </List.Item>
                            ))}
                          </List>
                        </>
                      )}
                    </Accordion.Panel>
                  </Accordion.Item>
                  
                  <Accordion.Item value="transaction-issues">
                    <Accordion.Control icon={<IconDatabase size={16} />}>
                      <Text fw={500}>Transaction Issues</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List>
                        <List.Item>
                          <Text size="sm">
                            <strong>Long-running Transactions:</strong> Transactions holding locks for extended periods increase deadlock risk.
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text size="sm">
                            <strong>Inconsistent Access Patterns:</strong> Transactions accessing resources in different orders create circular wait conditions.
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text size="sm">
                            <strong>High Concurrency:</strong> Multiple transactions competing for the same resources increase contention and deadlock probability.
                          </Text>
                        </List.Item>
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                  
                  <Accordion.Item value="schema-issues">
                    <Accordion.Control icon={<IconSquarePlus size={16} />}>
                      <Text fw={500}>Schema and Index Considerations</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List>
                        <List.Item>
                          <Text size="sm">
                            <strong>Missing Indexes:</strong> Operations without proper indexes can lead to excessive row or table locking.
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text size="sm">
                            <strong>Complex Constraints:</strong> Foreign key constraints and triggers can cascade locks across multiple tables.
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text size="sm">
                            <strong>Table Design:</strong> Highly normalized schemas may require transactions to touch many tables, increasing deadlock risk.
                          </Text>
                        </List.Item>
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
            </Paper>
          )}
          
          {activeTab === 'examples' && (
            <Paper p="md" withBorder>
              <Group spacing="xs" mb="md">
                <IconCode size={18} />
                <Text fw={600}>Code Examples</Text>
              </Group>
              
              <Divider mb="md" />
              
              <Text mb="lg">
                Below are code examples demonstrating how to avoid this type of deadlock in your application.
              </Text>
              
              <Tabs defaultValue="java">
                <Tabs.List>
                  <Tabs.Tab value="java">Java</Tabs.Tab>
                  <Tabs.Tab value="python">Python</Tabs.Tab>
                  <Tabs.Tab value="typescript">TypeScript</Tabs.Tab>
                  <Tabs.Tab value="sql">SQL</Tabs.Tab>
                </Tabs.List>
                
                <Tabs.Panel value="java" pt="xs">
                  <Text fw={500} size="sm" mb="xs">Preventing deadlocks in Java with JDBC</Text>
                  <Code block language="java">
{`// Example of consistent ordering to prevent deadlocks
public void transferBetweenAccounts(long sourceId, long targetId, BigDecimal amount) {
    // Always access accounts in a consistent order based on ID
    long firstId = Math.min(sourceId, targetId);
    long secondId = Math.max(sourceId, targetId);
    
    try (Connection conn = dataSource.getConnection()) {
        conn.setAutoCommit(false);
        
        try {
            // Lock accounts in consistent order (lowest ID first)
            String selectForUpdateSql = "SELECT balance FROM accounts WHERE id = ? FOR UPDATE";
            
            try (PreparedStatement stmt = conn.prepareStatement(selectForUpdateSql)) {
                // Lock first account
                stmt.setLong(1, firstId);
                ResultSet rs = stmt.executeQuery();
                // Process result
                
                // Lock second account
                stmt.setLong(1, secondId);
                rs = stmt.executeQuery();
                // Process result
            }
            
            // Update balances
            String updateSql = "UPDATE accounts SET balance = balance + ? WHERE id = ?";
            try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                // Update based on whether this is source or target
                if (sourceId == firstId) {
                    // First is source, decrease balance
                    updateStmt.setBigDecimal(1, amount.negate());
                    updateStmt.setLong(2, firstId);
                    updateStmt.executeUpdate();
                    
                    // Second is target, increase balance
                    updateStmt.setBigDecimal(1, amount);
                    updateStmt.setLong(2, secondId);
                    updateStmt.executeUpdate();
                } else {
                    // First is target, increase balance
                    updateStmt.setBigDecimal(1, amount);
                    updateStmt.setLong(2, firstId);
                    updateStmt.executeUpdate();
                    
                    // Second is source, decrease balance
                    updateStmt.setBigDecimal(1, amount.negate());
                    updateStmt.setLong(2, secondId);
                    updateStmt.executeUpdate();
                }
            }
            
            conn.commit();
        } catch (Exception e) {
            conn.rollback();
            throw e;
        }
    }
}`}
                  </Code>
                </Tabs.Panel>
                
                <Tabs.Panel value="python" pt="xs">
                  <Text fw={500} size="sm" mb="xs">Preventing deadlocks in Python with SQLAlchemy</Text>
                  <Code block language="python">
{`# Example of preventing deadlocks in Python using SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import time

def transfer_with_retry(source_id, target_id, amount, max_retries=3):
    # Get database connection
    engine = create_engine('postgresql://user:password@localhost/mydatabase')
    Session = sessionmaker(bind=engine)
    
    # Sort IDs to ensure consistent ordering
    first_id, second_id = sorted([source_id, target_id])
    
    retries = 0
    while retries < max_retries:
        try:
            with Session() as session:
                # Start transaction
                session.begin()
                
                try:
                    # Lock accounts in consistent order
                    # Get first account with lock
                    first_account = session.execute(
                        text("SELECT * FROM accounts WHERE id = :id FOR UPDATE"),
                        {"id": first_id}
                    ).fetchone()
                    
                    # Get second account with lock
                    second_account = session.execute(
                        text("SELECT * FROM accounts WHERE id = :id FOR UPDATE"),
                        {"id": second_id}
                    ).fetchone()
                    
                    # Update balances
                    if source_id == first_id:
                        # First is source, second is target
                        session.execute(
                            text("UPDATE accounts SET balance = balance - :amount WHERE id = :id"),
                            {"amount": amount, "id": first_id}
                        )
                        session.execute(
                            text("UPDATE accounts SET balance = balance + :amount WHERE id = :id"),
                            {"amount": amount, "id": second_id}
                        )
                    else:
                        # First is target, second is source
                        session.execute(
                            text("UPDATE accounts SET balance = balance + :amount WHERE id = :id"),
                            {"amount": amount, "id": first_id}
                        )
                        session.execute(
                            text("UPDATE accounts SET balance = balance - :amount WHERE id = :id"),
                            {"amount": amount, "id": second_id}
                        )
                    
                    # Commit transaction
                    session.commit()
                    return True
                    
                except Exception as e:
                    # Rollback on error
                    session.rollback()
                    
                    # Check if this is a deadlock error
                    if "deadlock detected" in str(e).lower():
                        retries += 1
                        if retries < max_retries:
                            # Exponential backoff
                            time.sleep(0.1 * (2 ** retries))
                            continue
                    
                    # Re-raise non-deadlock errors or if max retries reached
                    raise
        
        except Exception as e:
            # Re-raise any outer exceptions
            raise
    
    raise Exception(f"Failed after {max_retries} attempts due to deadlocks")`}
                  </Code>
                </Tabs.Panel>
                
                <Tabs.Panel value="typescript" pt="xs">
                  <Text fw={500} size="sm" mb="xs">Preventing deadlocks in TypeScript with pg (node-postgres)</Text>
                  <Code block language="typescript">
{`// Example of preventing deadlocks in TypeScript using pg
import { Pool } from 'pg';

interface Account {
  id: number;
  balance: number;
}

export async function transferWithRetry(
  sourceId: number,
  targetId: number,
  amount: number,
  maxRetries: number = 3
): Promise<boolean> {
  const pool = new Pool({
    connectionString: 'postgresql://user:password@localhost/mydatabase'
  });
  
  // Sort IDs to ensure consistent ordering
  const [firstId, secondId] = [sourceId, targetId].sort((a, b) => a - b);
  
  let retries = 0;
  
  while (retries < maxRetries) {
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Lock accounts in consistent order (lowest ID first)
      const firstAccount = await client.query<Account>(
        'SELECT * FROM accounts WHERE id = $1 FOR UPDATE',
        [firstId]
      );
      
      const secondAccount = await client.query<Account>(
        'SELECT * FROM accounts WHERE id = $1 FOR UPDATE',
        [secondId]
      );
      
      // Perform updates
      if (sourceId === firstId) {
        // First is source, second is target
        await client.query(
          'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
          [amount, firstId]
        );
        
        await client.query(
          'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
          [amount, secondId]
        );
      } else {
        // First is target, second is source
        await client.query(
          'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
          [amount, firstId]
        );
        
        await client.query(
          'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
          [amount, secondId]
        );
      }
      
      // Commit transaction
      await client.query('COMMIT');
      return true;
      
    } catch (err) {
      // Rollback on error
      await client.query('ROLLBACK');
      
      // Check if this is a deadlock error
      const errorMessage = (err as Error).message.toLowerCase();
      if (errorMessage.includes('deadlock detected')) {
        retries++;
        if (retries < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
          continue;
        }
      }
      
      // Re-throw non-deadlock errors or if max retries reached
      throw err;
    } finally {
      client.release();
    }
  }
  
  throw new Error(\`Failed after \${maxRetries} attempts due to deadlocks\`);
}`}
                  </Code>
                </Tabs.Panel>
                
                <Tabs.Panel value="sql" pt="xs">
                  <Text fw={500} size="sm" mb="xs">Preventing deadlocks with optimized SQL</Text>
                  <Code block language="sql">
{`-- Example of preventing deadlocks in a PostgreSQL stored procedure
CREATE OR REPLACE FUNCTION transfer_funds(
  source_account_id BIGINT,
  target_account_id BIGINT,
  transfer_amount NUMERIC(15,2)
) RETURNS BOOLEAN AS $$
DECLARE
  first_id BIGINT;
  second_id BIGINT;
  is_source_first BOOLEAN;
BEGIN
  -- Ensure consistent ordering by sorting account IDs
  IF source_account_id < target_account_id THEN
    first_id := source_account_id;
    second_id := target_account_id;
    is_source_first := TRUE;
  ELSE
    first_id := target_account_id;
    second_id := source_account_id;
    is_source_first := FALSE;
  END IF;
  
  -- Lock accounts in consistent order (lowest ID first)
  PERFORM * FROM accounts WHERE id = first_id FOR UPDATE;
  PERFORM * FROM accounts WHERE id = second_id FOR UPDATE;
  
  -- Check if source account has sufficient funds
  IF (SELECT balance FROM accounts WHERE id = source_account_id) < transfer_amount THEN
    RAISE EXCEPTION 'Insufficient funds in source account';
  END IF;
  
  -- Update the balances
  UPDATE accounts 
  SET balance = balance - transfer_amount 
  WHERE id = source_account_id;
  
  UPDATE accounts 
  SET balance = balance + transfer_amount 
  WHERE id = target_account_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Example of index optimization to reduce lock contention
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Example transaction with timeout to prevent long-running transactions
BEGIN;
SET LOCAL statement_timeout = '5s';
SELECT * FROM transfer_funds(123, 456, 100.00);
COMMIT;`}
                  </Code>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          )}
        </Box>
      </Tabs>
    </div>
  );
};

export default React.memo(RecommendationPanel);
