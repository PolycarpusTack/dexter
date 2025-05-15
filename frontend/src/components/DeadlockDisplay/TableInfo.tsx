import React, { useMemo } from 'react';
import { 
  Table, 
  Paper, 
  Text, 
  Group, 
  Badge, 
  Skeleton, 
  Tabs,
  Box,
  Tooltip,
  ThemeIcon,
  useMantineTheme
} from '@mantine/core';
import { 
  IconDatabase, 
  IconUserCode, 
  IconLock, 
  IconInfoCircle, 
  IconArrowRight,
  IconTable,
  IconKey,
  IconAlertCircle
} from '@tabler/icons-react';
import { List as VirtualList } from 'react-virtuoso';

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
  tables?: string[];
  locks_held?: string[];
  locks_waiting?: string[];
}

interface Relation {
  relationId: number;
  schema?: string;
  name?: string;
  lockingProcesses?: number[];
}

interface TableInfoProps {
  data?: {
    processes?: Process[];
    relations?: Relation[];
    [key: string]: any;
  };
  isLoading: boolean;
  isMasked?: boolean;
  maskText?: (text: string | undefined) => string;
}

/**
 * Component for displaying tabular information about deadlock processes and relations
 */
const TableInfo: React.FC<TableInfoProps> = ({ 
  data, 
  isLoading,
  isMasked = false,
  maskText = (text) => text || ''
}) => {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = React.useState<string | null>('processes');
  
  // Filter processes in deadlock cycle
  const processesInCycle = useMemo(() => {
    if (!data?.processes) return [];
    return data.processes.filter(process => process.inCycle);
  }, [data?.processes]);
  
  // Memoized map of process PIDs for fast lookups
  const cycleProcessIds = useMemo(() => {
    const idMap = new Set<number>();
    processesInCycle.forEach(p => idMap.add(p.pid));
    return idMap;
  }, [processesInCycle]);
  
  // Filter relations involved in deadlock with optimized lookup
  const relationsInDeadlock = useMemo(() => {
    if (!data?.relations) return [];
    
    return data.relations.filter(relation => 
      relation.lockingProcesses?.some(pid => cycleProcessIds.has(pid))
    );
  }, [data?.relations, cycleProcessIds]);
  
  // Process row component
  const ProcessRow = React.memo<{ process: Process }>(({ process }) => {
    return (
      <tr style={process.inCycle ? { backgroundColor: theme.fn.rgba(theme.colors.red[1], 0.5) } : undefined}>
        <td style={{ whiteSpace: 'nowrap' }}>
          <Group spacing="xs">
            <Text>{process.pid}</Text>
            {process.inCycle && (
              <Badge color="red" size="xs">In Cycle</Badge>
            )}
          </Group>
        </td>
        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isMasked ? maskText(process.applicationName) : process.applicationName}
        </td>
        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isMasked ? maskText(process.username) : process.username}
        </td>
        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {process.databaseName}
        </td>
        <td>
          {process.waitEventType} {process.waitEvent ? `(${process.waitEvent})` : ''}
        </td>
        <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Tooltip 
            label={isMasked ? maskText(process.query) : process.query}
            position="top"
            multiline
            width={500}
            withArrow
          >
            <Text size="sm" style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {isMasked ? maskText(process.query) : process.query}
            </Text>
          </Tooltip>
        </td>
        <td>
          {process.blockingPids && process.blockingPids.length > 0 ? (
            <Group spacing="xs">
              {process.blockingPids.map(pid => (
                <Badge key={pid} size="sm">{pid}</Badge>
              ))}
            </Group>
          ) : '-'}
        </td>
      </tr>
    );
  });
  
  // Relation row component
  const RelationRow = React.memo<{ relation: Relation }>(({ relation }) => {
    const isInDeadlock = relationsInDeadlock.some(r => r.relationId === relation.relationId);
    
    return (
      <tr style={isInDeadlock ? { backgroundColor: theme.fn.rgba(theme.colors.red[1], 0.5) } : undefined}>
        <td style={{ whiteSpace: 'nowrap' }}>
          <Group spacing="xs">
            <Text>{relation.relationId}</Text>
            {isInDeadlock && (
              <Badge color="red" size="xs">In Deadlock</Badge>
            )}
          </Group>
        </td>
        <td>
          {isMasked ? maskText(relation.schema) : relation.schema}
        </td>
        <td>
          {isMasked ? maskText(relation.name) : relation.name}
        </td>
        <td>
          {relation.lockingProcesses && relation.lockingProcesses.length > 0 ? (
            <Group spacing="xs">
              {relation.lockingProcesses.map(pid => (
                <Badge key={pid} size="sm">{pid}</Badge>
              ))}
            </Group>
          ) : '-'}
        </td>
      </tr>
    );
  });
  
  // Deadlock chain component
  const DeadlockChain = React.memo(() => {
    if (!data?.deadlockChain || data.deadlockChain.length === 0) {
      return (
        <Text color="dimmed">No deadlock chain information available.</Text>
      );
    }
    
    // Create a map of process wait events for fast lookup
    const processWaitEvents = useMemo(() => {
      if (!data?.processes) return new Map<number, string>();
      
      const eventMap = new Map<number, string>();
      data.processes.forEach(process => {
        if (process.waitEvent) {
          eventMap.set(process.pid, process.waitEvent);
        }
      });
      return eventMap;
    }, [data?.processes]);
    
    // Memoize the process node renderer
    const renderProcessNode = useCallback((pid: number, isFirstAgain: boolean = false) => (
      <Box
        p="sm"
        style={{
          backgroundColor: theme.fn.rgba(theme.colors.red[6], 0.1),
          borderRadius: theme.radius.sm,
          border: `1px solid ${theme.colors.red[3]}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '4px 8px',
        }}
      >
        <Group spacing={5}>
          <IconUserCode size={14} />
          <Text fw={500} size="sm">Process {pid}</Text>
        </Group>
        
        {!isFirstAgain && processWaitEvents.get(pid) && (
          <Text size="xs" color="dimmed">
            Waiting for: {processWaitEvents.get(pid)}
          </Text>
        )}
      </Box>
    ), [theme, processWaitEvents]);
    
    // Memoize chain nodes for stable rendering
    const chainNodes = useMemo(() => {
      return data.deadlockChain.map((pid: number, index: number) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <IconArrowRight size={16} color={theme.colors.gray[6]} />
          )}
          {renderProcessNode(pid)}
        </React.Fragment>
      ));
    }, [data.deadlockChain, renderProcessNode, theme.colors.gray]);
    
    // Create cyclic connection if needed
    const cyclicConnection = useMemo(() => {
      if (data.deadlockChain.length <= 1) return null;
      
      return (
        <>
          <IconArrowRight size={16} color={theme.colors.gray[6]} />
          {renderProcessNode(data.deadlockChain[0], true)}
        </>
      );
    }, [data.deadlockChain, renderProcessNode, theme.colors.gray]);
    
    return (
      <Paper p="md" withBorder>
        <Text fw={600} mb="sm">Deadlock Chain</Text>
        <Box style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Group spacing="xs" position="center" style={{ flexWrap: 'nowrap' }}>
            {chainNodes}
            {cyclicConnection}
          </Group>
        </Box>
      </Paper>
    );
  });
  
  // Lock compatibility matrix data - defined outside component for constant memory reference
  const lockTypes = useMemo(() => [
    'AccessShare', 'RowShare', 'RowExclusive', 'ShareUpdateExclusive', 
    'Share', 'ShareRowExclusive', 'Exclusive', 'AccessExclusive'
  ], []);
  
  // Compatibility matrix: true means compatible
  const compatibilityMatrix = useMemo<Record<string, Record<string, boolean>>>(() => ({
    'AccessShare': {
      'AccessShare': true,
      'RowShare': true,
      'RowExclusive': true,
      'ShareUpdateExclusive': true,
      'Share': true,
      'ShareRowExclusive': true,
      'Exclusive': true,
      'AccessExclusive': false
    },
    'RowShare': {
      'AccessShare': true,
      'RowShare': true,
      'RowExclusive': true,
      'ShareUpdateExclusive': true,
      'Share': true,
      'ShareRowExclusive': true,
      'Exclusive': false,
      'AccessExclusive': false
    },
    // ... and so on for all lock types
  }), []);
  
  // Lock compatibility matrix component
  const LockCompatibilityMatrix = React.memo(() => {
    // Callback to determine compatibility, memoized to preserve reference
    const getIsCompatible = React.useCallback((rowType: string, colType: string) => {
      return compatibilityMatrix[rowType]?.[colType] ?? false;
    }, [compatibilityMatrix]);
    
    // Memoize the row rendering function
    const renderMatrixRow = React.useCallback((rowLockType: string) => (
      <tr key={rowLockType}>
        <td>
          <Tooltip label={rowLockType}>
            <Text size="xs">{rowLockType.substring(0, 3)}</Text>
          </Tooltip>
        </td>
        {lockTypes.map(colLockType => {
          const isCompatible = getIsCompatible(rowLockType, colLockType);
          
          return (
            <td key={colLockType} style={{ textAlign: 'center' }}>
              <ThemeIcon 
                size="sm" 
                color={isCompatible ? 'green' : 'red'} 
                variant="light"
                radius="xl"
              >
                {isCompatible ? '✓' : '✗'}
              </ThemeIcon>
            </td>
          );
        })}
      </tr>
    ), [lockTypes, getIsCompatible]);
    
    // Memoize header cells
    const headerCells = React.useMemo(() => lockTypes.map(lockType => (
      <th key={lockType} style={{ textAlign: 'center' }}>
        <Tooltip label={lockType}>
          <Text size="xs">{lockType.substring(0, 3)}</Text>
        </Tooltip>
      </th>
    )), [lockTypes]);
    
    // Memoize table rows
    const tableRows = React.useMemo(() => 
      lockTypes.map(rowLockType => renderMatrixRow(rowLockType)), 
      [lockTypes, renderMatrixRow]
    );
    
    return (
      <Paper p="md" withBorder>
        <Group mb="md" position="apart">
          <Group spacing="xs">
            <IconKey size={16} />
            <Text fw={600}>Lock Compatibility Matrix</Text>
          </Group>
          <Tooltip label="Lock compatibility determines whether two lock types can be held simultaneously">
            <IconInfoCircle size={16} color={theme.colors.gray[6]} style={{ cursor: 'pointer' }} />
          </Tooltip>
        </Group>
        
        <Text size="sm" color="dimmed" mb="md">
          This table shows which lock types are compatible with each other. When two processes request incompatible locks, one must wait until the other releases its lock.
        </Text>
        
        <Box style={{ overflowX: 'auto' }}>
          <Table style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th></th>
                {headerCells}
              </tr>
            </thead>
            <tbody>
              {tableRows}
            </tbody>
          </Table>
        </Box>
      </Paper>
    );
  });
  
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
          <Text>No deadlock information available</Text>
        </Group>
        <Text size="sm" color="dimmed">
          The server was unable to provide detailed information about this deadlock.
          This could be due to limited information in the original error message or
          an unsupported deadlock pattern.
        </Text>
      </Paper>
    );
  }
  
  return (
    <div>
      <DeadlockChain />
      
      <Paper p="md" withBorder mt="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab 
              value="processes" 
              leftSection={<IconUserCode size={14} />}
            >
              Processes {processesInCycle.length > 0 && 
                <Badge size="xs" color="red" ml={5}>
                  {processesInCycle.length} in cycle
                </Badge>
              }
            </Tabs.Tab>
            
            <Tabs.Tab 
              value="relations" 
              leftSection={<IconTable size={14} />}
            >
              Tables {relationsInDeadlock.length > 0 && 
                <Badge size="xs" color="red" ml={5}>
                  {relationsInDeadlock.length} involved
                </Badge>
              }
            </Tabs.Tab>
            
            <Tabs.Tab 
              value="locks" 
              leftSection={<IconLock size={14} />}
            >
              Lock Compatibility
            </Tabs.Tab>
          </Tabs.List>
          
          <div style={{ marginTop: '1rem' }}>
            {activeTab === 'processes' && (
              <>
                <Text size="sm" mb="md">
                  {data.processes.length} process{data.processes.length !== 1 ? 'es' : ''} involved in this deadlock
                </Text>
                <Box style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 800 }}>
                    <Table striped withBorder style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>PID</th>
                          <th>Application</th>
                          <th>Username</th>
                          <th>Database</th>
                          <th>Wait Event</th>
                          <th>Query</th>
                          <th>Blocking PIDs</th>
                        </tr>
                      </thead>
                    </Table>
                    
                    {data.processes.length > 10 ? (
                      <div style={{ height: '400px' }}>
                        <VirtualList
                          style={{ height: '100%', width: '100%' }}
                          totalCount={data.processes.length}
                          itemContent={(index) => {
                            const process = data.processes[index];
                            return (
                              <Table striped withBorder style={{ width: '100%', tableLayout: 'fixed', borderTop: 'none' }}>
                                <tbody>
                                  <ProcessRow key={process.pid} process={process} />
                                </tbody>
                              </Table>
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <Table striped withBorder style={{ width: '100%', borderTop: 'none' }}>
                        <tbody>
                          {data.processes.map(process => (
                            <ProcessRow key={process.pid} process={process} />
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Box>
              </>
            )}
            
            {activeTab === 'relations' && (
              <>
                <Text size="sm" mb="md">
                  {data.relations?.length || 0} table{(data.relations?.length || 0) !== 1 ? 's' : ''} involved in this deadlock
                </Text>
                <Box style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 800 }}>
                    <Table striped withBorder style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Relation ID</th>
                          <th>Schema</th>
                          <th>Name</th>
                          <th>Locking Processes</th>
                        </tr>
                      </thead>
                    </Table>
                    
                    {data.relations && data.relations.length > 10 ? (
                      <div style={{ height: '400px' }}>
                        <VirtualList
                          style={{ height: '100%', width: '100%' }}
                          totalCount={data.relations.length}
                          itemContent={(index) => {
                            const relation = data.relations![index];
                            return (
                              <Table striped withBorder style={{ width: '100%', tableLayout: 'fixed', borderTop: 'none' }}>
                                <tbody>
                                  <RelationRow key={relation.relationId} relation={relation} />
                                </tbody>
                              </Table>
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <Table striped withBorder style={{ width: '100%', borderTop: 'none' }}>
                        <tbody>
                          {data.relations?.map(relation => (
                            <RelationRow key={relation.relationId} relation={relation} />
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Box>
              </>
            )}
            
            {activeTab === 'locks' && <LockCompatibilityMatrix />}
          </div>
        </Tabs>
      </Paper>
    </div>
  );
};

export default React.memo(TableInfo);
