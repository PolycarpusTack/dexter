import React, { useState } from 'react';
import {
  Table,
  Text,
  Badge,
  Group,
  Paper,
  TextInput,
  Select,
  Box,
  Progress,
  Accordion,
  Code,
  Button,
  ActionIcon,
  Tooltip,
  Stack,
  Card
} from '@mantine/core';
import {
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconEye,
  IconCode,
  IconAlertTriangle,
  IconBrain
} from '@tabler/icons-react';

interface LeakPattern {
  type: string;
  confidence: number;
  affected_objects: string[];
  total_retained_size: number;
  description: string;
  evidence: Record<string, any>;
}

interface LeakPatternTableProps {
  patterns: LeakPattern[];
}

export const LeakPatternTable: React.FC<LeakPatternTableProps> = ({ patterns }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'confidence' | 'size' | 'objects'>('confidence');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPattern, setSelectedPattern] = useState<LeakPattern | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getLeakTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'dom_detached': 'red',
      'event_listener': 'orange',
      'closure_leak': 'yellow',
      'react_context': 'purple',
      'vue_watcher': 'green',
      'angular_observable': 'cyan',
      'global_pollution': 'pink',
      'circular_reference': 'indigo',
      'timer_leak': 'teal',
      'promise_leak': 'blue',
      'wasm_interop': 'grape'
    };
    return colorMap[type] || 'gray';
  };

  const getLeakTypeIcon = (type: string) => {
    switch (type) {
      case 'dom_detached':
        return '🗂️';
      case 'event_listener':
        return '🎧';
      case 'closure_leak':
        return '🔒';
      case 'react_context':
        return '⚛️';
      case 'vue_watcher':
        return '👁️';
      case 'angular_observable':
        return '🔄';
      case 'global_pollution':
        return '🌍';
      case 'circular_reference':
        return '♻️';
      case 'timer_leak':
        return '⏰';
      case 'promise_leak':
        return '🤝';
      case 'wasm_interop':
        return '⚙️';
      default:
        return '❓';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'red';
    if (confidence >= 0.6) return 'orange';
    if (confidence >= 0.4) return 'yellow';
    return 'gray';
  };

  // Filter and sort patterns
  const filteredPatterns = patterns
    .filter(pattern => 
      pattern.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pattern.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'size':
          comparison = a.total_retained_size - b.total_retained_size;
          break;
        case 'objects':
          comparison = a.affected_objects.length - b.affected_objects.length;
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

  const handleSort = (column: 'confidence' | 'size' | 'objects') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column: 'confidence' | 'size' | 'objects') => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />;
  };

  if (patterns.length === 0) {
    return (
      <Paper withBorder p="xl" ta="center">
        <IconBrain size={48} color="gray" style={{ margin: '0 auto 16px' }} />
        <Text size="lg" fw={500} mb="xs">No Memory Leak Patterns Detected</Text>
        <Text color="dimmed">
          This could mean your application has good memory management practices,
          or the heap snapshot doesn't contain enough data for pattern detection.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack spacing="md">
      {/* Controls */}
      <Group position="apart">
        <TextInput
          placeholder="Search patterns..."
          icon={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
        />
        <Group spacing="xs">
          <Text size="sm" color="dimmed">
            {filteredPatterns.length} of {patterns.length} patterns
          </Text>
        </Group>
      </Group>

      {/* Patterns Table */}
      <Paper withBorder>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Pattern Type</th>
              <th>
                <Button
                  variant="subtle"
                  size="xs"
                  rightIcon={getSortIcon('confidence')}
                  onClick={() => handleSort('confidence')}
                >
                  Confidence
                </Button>
              </th>
              <th>
                <Button
                  variant="subtle"
                  size="xs"
                  rightIcon={getSortIcon('objects')}
                  onClick={() => handleSort('objects')}
                >
                  Objects
                </Button>
              </th>
              <th>
                <Button
                  variant="subtle"
                  size="xs"
                  rightIcon={getSortIcon('size')}
                  onClick={() => handleSort('size')}
                >
                  Retained Size
                </Button>
              </th>
              <th>Description</th>
              <th width={100}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatterns.map((pattern, index) => (
              <tr key={index}>
                <td>
                  <Group spacing="xs">
                    <Text style={{ fontSize: '16px' }}>{getLeakTypeIcon(pattern.type)}</Text>
                    <Badge 
                      color={getLeakTypeColor(pattern.type)} 
                      variant="light"
                      size="sm"
                    >
                      {pattern.type.replace('_', ' ')}
                    </Badge>
                  </Group>
                </td>
                <td>
                  <Group spacing="xs">
                    <Progress
                      value={pattern.confidence * 100}
                      color={getConfidenceColor(pattern.confidence)}
                      size="sm"
                      style={{ width: 60 }}
                    />
                    <Text size="sm" fw={500}>
                      {(pattern.confidence * 100).toFixed(0)}%
                    </Text>
                  </Group>
                </td>
                <td>
                  <Badge variant="outline" size="sm">
                    {pattern.affected_objects.length}
                  </Badge>
                </td>
                <td>
                  <Text size="sm" fw={500}>
                    {formatBytes(pattern.total_retained_size)}
                  </Text>
                </td>
                <td>
                  <Text size="sm" style={{ maxWidth: 300 }}>
                    {pattern.description.length > 80 
                      ? pattern.description.substring(0, 77) + '...'
                      : pattern.description
                    }
                  </Text>
                </td>
                <td>
                  <Group spacing="xs">
                    <Tooltip label="View Details">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => setSelectedPattern(pattern)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      {/* Pattern Details Modal/Accordion */}
      {selectedPattern && (
        <Card withBorder p="md">
          <Group position="apart" mb="md">
            <Group spacing="xs">
              <Text style={{ fontSize: '20px' }}>{getLeakTypeIcon(selectedPattern.type)}</Text>
              <Text size="lg" fw={600}>
                {selectedPattern.type.replace('_', ' ').toUpperCase()} Details
              </Text>
              <Badge color={getLeakTypeColor(selectedPattern.type)}>
                {(selectedPattern.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </Group>
            <Button size="xs" variant="light" onClick={() => setSelectedPattern(null)}>
              Close
            </Button>
          </Group>

          <Stack spacing="md">
            <Box>
              <Text size="sm" fw={500} mb="xs">Description</Text>
              <Text size="sm">{selectedPattern.description}</Text>
            </Box>

            <Group grow>
              <Box>
                <Text size="sm" fw={500} mb="xs">Affected Objects</Text>
                <Badge size="lg" variant="outline">
                  {selectedPattern.affected_objects.length} objects
                </Badge>
              </Box>
              <Box>
                <Text size="sm" fw={500} mb="xs">Memory Impact</Text>
                <Badge size="lg" color="red" variant="light">
                  {formatBytes(selectedPattern.total_retained_size)}
                </Badge>
              </Box>
            </Group>

            {selectedPattern.evidence && Object.keys(selectedPattern.evidence).length > 0 && (
              <Box>
                <Text size="sm" fw={500} mb="xs">Evidence</Text>
                <Accordion>
                  <Accordion.Item value="evidence">
                    <Accordion.Control icon={<IconAlertTriangle size={16} />}>
                      Pattern Evidence ({Object.keys(selectedPattern.evidence).length} items)
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Code block>
                        {JSON.stringify(selectedPattern.evidence, null, 2)}
                      </Code>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
            )}

            {selectedPattern.affected_objects.length > 0 && (
              <Box>
                <Text size="sm" fw={500} mb="xs">Sample Object IDs</Text>
                <Group spacing="xs">
                  {selectedPattern.affected_objects.slice(0, 10).map((objId, index) => (
                    <Badge key={index} size="xs" variant="outline">
                      {objId.length > 12 ? objId.substring(0, 9) + '...' : objId}
                    </Badge>
                  ))}
                  {selectedPattern.affected_objects.length > 10 && (
                    <Badge size="xs" color="gray">
                      +{selectedPattern.affected_objects.length - 10} more
                    </Badge>
                  )}
                </Group>
              </Box>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
};