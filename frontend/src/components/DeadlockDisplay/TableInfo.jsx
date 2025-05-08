// frontend/src/components/DeadlockDisplay/TableInfo.jsx

import React from 'react';
import { 
  Paper, 
  Text, 
  Loader, 
  useMantineTheme, 
  Group,
  Badge,
  Table,
  ScrollArea,
  Accordion,
  Box,
  Tooltip,
  Code,
  Stack
} from '@mantine/core';
import { 
  IconLock, 
  IconArrowRight, 
  IconDatabaseOff,
  IconExclamationCircle,
  IconTable,
  IconKey,
  IconLockOpen,
  IconRefresh,
  IconClock
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Displays detailed information about tables involved in a deadlock
 */
function TableInfo({ data, isLoading }) {
  const theme = useMantineTheme();
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 50 }}>
        <Loader />
      </Box>
    );
  }
  
  if (!data || !data.nodes || !data.edges) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 50 }}>
        <Group>
          <IconDatabaseOff size={20} />
          <Text c="dimmed">No deadlock data available</Text>
        </Group>
      </Box>
    );
  }
  
  // Extract tables from the visualization data
  const tables = data.nodes.filter(node => node.type === 'table');
  
  // Extract processes from the visualization data
  const processes = data.nodes.filter(node => node.type === 'process');
  
  // Group locks by table
  const tableLocks = {};
  
  // Populate table locks information from processes
  processes.forEach(process => {
    const processId = process.id;
    const processLabel = process.label;
    
    // Add locks held
    if (process.locks_held) {
      process.locks_held.forEach(lockInfo => {
        // Parse the lock info to extract table
        const tableMatch = lockInfo.match(/on\s+(\w+)/i);
        if (tableMatch && tableMatch[1]) {
          const tableName = tableMatch[1];
          
          if (!tableLocks[tableName]) {
            tableLocks[tableName] = {
              name: tableName,
              held: [],
              waiting: []
            };
          }
          
          tableLocks[tableName].held.push({
            process: processId,
            processLabel,
            lockInfo,
            inCycle: process.inCycle
          });
        }
      });
    }
    
    // Add locks waiting
    if (process.locks_waiting) {
      process.locks_waiting.forEach(lockInfo => {
        // Parse the lock info to extract table
        const tableMatch = lockInfo.match(/on\s+(\w+)/i);
        if (tableMatch && tableMatch[1]) {
          const tableName = tableMatch[1];
          
          if (!tableLocks[tableName]) {
            tableLocks[tableName] = {
              name: tableName,
              held: [],
              waiting: []
            };
          }
          
          tableLocks[tableName].waiting.push({
            process: processId,
            processLabel,
            lockInfo,
            inCycle: process.inCycle
          });
        }
      });
    }
  });
  
  // Convert tableLocks object to array
  const tableLocksArray = Object.values(tableLocks);
  
  // Add tables that have no locks but are in the visualization
  tables.forEach(table => {
    const tableName = table.label;
    if (!tableLocks[tableName]) {
      tableLocksArray.push({
        name: tableName,
        held: [],
        waiting: [],
        inCycle: table.inCycle
      });
    } else {
      // Add inCycle flag from the table node
      tableLocks[tableName].inCycle = table.inCycle;
    }
  });
  
  // Sort tables by involvement in deadlock (deadlock tables first) and then by number of locks
  tableLocksArray.sort((a, b) => {
    if (a.inCycle && !b.inCycle) return -1;
    if (!a.inCycle && b.inCycle) return 1;
    
    const aTotal = a.held.length + a.waiting.length;
    const bTotal = b.held.length + b.waiting.length;
    return bTotal - aTotal;
  });
  
  return (
    <Stack spacing="md">
      {/* Deadlock details */}
      {data.locks_summary && (
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="xs">Deadlock Summary</Text>
          <Text size="sm">{data.locks_summary}</Text>
          
          {data.timestamp && (
            <Group mt="sm" spacing="xs">
              <IconClock size={14} color={theme.colors.gray[6]} />
              <Text size="sm" c="dimmed">
                Occurred {formatDistanceToNow(new Date(data.timestamp), { addSuffix: true })}
              </Text>
            </Group>
          )}
        </Paper>
      )}
      
      {/* Table of involved tables with lock details */}
      <Paper p="md" withBorder radius="md">
        <Text fw={600} mb="md">Tables Involved in Deadlock</Text>
        
        {tableLocksArray.length === 0 ? (
          <Text size="sm" c="dimmed">No table locking information available</Text>
        ) : (
          <Accordion>
            {tableLocksArray.map((table, index) => (
              <Accordion.Item key={index} value={table.name}>
                <Accordion.Control>
                  <Group>
                    <IconTable size={16} color={table.inCycle ? theme.colors.red[6] : theme.colors.gray[6]} />
                    <Text fw={table.inCycle ? 600 : 400}>{table.name}</Text>
                    {table.inCycle && (
                      <Badge color="red" size="sm">In Deadlock</Badge>
                    )}
                    <Badge size="sm" color="blue">
                      {table.held.length + table.waiting.length} Locks
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="xs">
                    {/* Held locks */}
                    <Text fw={600} size="sm">Held Locks</Text>
                    {table.held.length === 0 ? (
                      <Text size="sm" c="dimmed">No held locks</Text>
                    ) : (
                      <ScrollArea h={table.held.length > 3 ? 200 : 'auto'} offsetScrollbars>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Process</Table.Th>
                              <Table.Th>Lock Type</Table.Th>
                              <Table.Th>Mode</Table.Th>
                              <Table.Th>Status</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {table.held.map((lock, lockIndex) => {
                              // Parse lock mode and type
                              const modeMatch = lock.lockInfo.match(/(ShareLock|ExclusiveLock|AccessShareLock|RowShareLock|RowExclusiveLock|ShareUpdateExclusiveLock|ShareRowExclusiveLock|AccessExclusiveLock)/);
                              const mode = modeMatch ? modeMatch[1] : 'Unknown';
                              
                              const typeMatch = lock.lockInfo.match(/(tuple|transactionid|relation|virtualxid|object|page|advisory)/i);
                              const type = typeMatch ? typeMatch[1] : 'relation';
                              
                              return (
                                <Table.Tr key={lockIndex} style={lock.inCycle ? { backgroundColor: theme.fn.rgba(theme.colors.red[1], 0.3) } : {}}>
                                  <Table.Td>
                                    <Group spacing="xs">
                                      <IconLock size={14} color={lock.inCycle ? theme.colors.red[6] : theme.colors.blue[6]} />
                                      <Text size="sm">{lock.processLabel}</Text>
                                      {lock.inCycle && (
                                        <Badge size="xs" color="red">Deadlocked</Badge>
                                      )}
                                    </Group>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm">{type}</Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge color={mode.includes('Exclusive') ? 'red' : 'blue'} size="sm">
                                      {mode}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm" c="green">Granted</Text>
                                  </Table.Td>
                                </Table.Tr>
                              );
                            })}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                    )}
                    
                    {/* Waiting locks */}
                    <Text fw={600} size="sm" mt="md">Waiting Locks</Text>
                    {table.waiting.length === 0 ? (
                      <Text size="sm" c="dimmed">No waiting locks</Text>
                    ) : (
                      <ScrollArea h={table.waiting.length > 3 ? 200 : 'auto'} offsetScrollbars>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Process</Table.Th>
                              <Table.Th>Lock Type</Table.Th>
                              <Table.Th>Mode</Table.Th>
                              <Table.Th>Status</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {table.waiting.map((lock, lockIndex) => {
                              // Parse lock mode and type
                              const modeMatch = lock.lockInfo.match(/(ShareLock|ExclusiveLock|AccessShareLock|RowShareLock|RowExclusiveLock|ShareUpdateExclusiveLock|ShareRowExclusiveLock|AccessExclusiveLock)/);
                              const mode = modeMatch ? modeMatch[1] : 'Unknown';
                              
                              const typeMatch = lock.lockInfo.match(/(tuple|transactionid|relation|virtualxid|object|page|advisory)/i);
                              const type = typeMatch ? typeMatch[1] : 'relation';
                              
                              return (
                                <Table.Tr key={lockIndex} style={lock.inCycle ? { backgroundColor: theme.fn.rgba(theme.colors.red[1], 0.3) } : {}}>
                                  <Table.Td>
                                    <Group spacing="xs">
                                      <IconLockOpen size={14} color={lock.inCycle ? theme.colors.red[6] : theme.colors.yellow[6]} />
                                      <Text size="sm">{lock.processLabel}</Text>
                                      {lock.inCycle && (
                                        <Badge size="xs" color="red">Deadlocked</Badge>
                                      )}
                                    </Group>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm">{type}</Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge color={mode.includes('Exclusive') ? 'red' : 'blue'} size="sm">
                                      {mode}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm" c="yellow">Waiting</Text>
                                  </Table.Td>
                                </Table.Tr>
                              );
                            })}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                    )}
                    
                    {/* Show any table access patterns if available */}
                    {data.tables && data.tables[table.name] && (
                      <>
                        <Text fw={600} size="sm" mt="md">Access Patterns</Text>
                        <Box p="xs" bg={theme.colors.gray[0]} style={{ borderRadius: theme.radius.sm }}>
                          <Code block>
                            {data.tables[table.name].accessPattern || 'No access pattern information available'}
                          </Code>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Paper>
      
      {/* Process locking details */}
      <Paper p="md" withBorder radius="md">
        <Text fw={600} mb="md">Processes</Text>
        
        {processes.length === 0 ? (
          <Text size="sm" c="dimmed">No process information available</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Process</Table.Th>
                <Table.Th>Application</Table.Th>
                <Table.Th>User</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Query</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {processes.map((process, index) => (
                <Table.Tr key={index} style={process.inCycle ? { backgroundColor: theme.fn.rgba(theme.colors.red[1], 0.3) } : {}}>
                  <Table.Td>
                    <Group spacing="xs">
                      <Text size="sm" fw={process.inCycle ? 600 : 400}>{process.label}</Text>
                      {process.inCycle && (
                        <Badge size="xs" color="red">Deadlocked</Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{process.application || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{process.username || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {process.inCycle ? (
                      <Badge color="red" size="sm">Blocked</Badge>
                    ) : process.locks_waiting && process.locks_waiting.length > 0 ? (
                      <Badge color="yellow" size="sm">Waiting</Badge>
                    ) : (
                      <Badge color="green" size="sm">Active</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Tooltip 
                      label={process.query} 
                      multiline 
                      width={400}
                      p="md"
                      withArrow
                      position="left"
                      disabled={!process.query}
                    >
                      <Text 
                        size="sm" 
                        style={{ 
                          maxWidth: '250px', 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {process.query || '-'}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}

export default TableInfo;
