// File: frontend/src/components/UI/KeyboardShortcutsGuide.tsx

import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Table, 
  Text, 
  Group, 
  ThemeIcon, 
  Modal, 
  Button,
  Kbd, 
  Stack,
  Divider,
  Tabs,
  Box,
  Badge
} from '@mantine/core';
import { 
  IconKeyboard, 
  IconSearch, 
  IconArrowUp, 
  IconArrowDown,
  IconArrowBarUp,
  IconArrowBarDown,
  IconArrowRight,
  IconRefresh,
  IconNavigation,
  IconArrowsMaximize,
  IconBulb,
  IconTable,
  IconDeviceDesktop,
  IconInfoCircle
} from '@tabler/icons-react';

interface KeyboardShortcutsGuideProps {
  opened?: boolean;
  onClose?: () => void;
  isMac?: boolean;
}

interface ShortcutSection {
  title: string;
  icon?: React.ReactNode;
  shortcuts: Array<{
    keys: string[];
    description: string;
    icon?: React.ReactNode;
    scope?: string;
  }>;
}

/**
 * Component for displaying keyboard shortcuts guide
 * Shows available keyboard shortcuts organized by category
 */
function KeyboardShortcutsGuide({ 
  opened: propOpened, 
  onClose,
  isMac = false
}: KeyboardShortcutsGuideProps): JSX.Element {
  const [opened, setOpened] = useState<boolean>(propOpened || false);
  
  // Listen for the custom event to toggle the guide
  useEffect(() => {
    const handleToggleGuide = () => {
      setOpened(prev => !prev);
    };
    
    document.addEventListener('toggle-keyboard-shortcuts-guide', handleToggleGuide);
    
    return () => {
      document.removeEventListener('toggle-keyboard-shortcuts-guide', handleToggleGuide);
    };
  }, []);
  
  // Also listen for the '?' key to open guide when not controlled by props
  useEffect(() => {
    if (propOpened === undefined) {
      const handleKeyPress = (event: KeyboardEvent) => {
        // Only respond to '?' key when not in an input
        if (
          event.key === '?' && 
          !(event.target instanceof HTMLInputElement || 
            event.target instanceof HTMLTextAreaElement)
        ) {
          event.preventDefault();
          setOpened(true);
        }
      };
      
      document.addEventListener('keydown', handleKeyPress);
      
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [propOpened]);
  
  // Update internal state when props change
  useEffect(() => {
    if (propOpened !== undefined) {
      setOpened(propOpened);
    }
  }, [propOpened]);
  
  // Handle closing
  const handleClose = () => {
    setOpened(false);
    if (onClose) {
      onClose();
    }
  };
  
  // Detect MacOS for showing appropriate key symbols
  const modKey = isMac ? '⌘' : 'Ctrl';
  
  // Define shortcut sections
  const shortcutSections: ShortcutSection[] = [
    {
      title: 'Global Navigation',
      icon: <IconNavigation size={16} />,
      shortcuts: [
        { 
          keys: [modKey, 'g'], 
          description: 'Go to dashboard',
          scope: 'global'
        },
        { 
          keys: [modKey, 'i'], 
          description: 'Go to issues',
          scope: 'global'
        },
        { 
          keys: [modKey, 'e'], 
          description: 'Go to events',
          scope: 'global'
        },
        { 
          keys: [modKey, 'd'], 
          description: 'Go to discover',
          scope: 'global'
        }
      ]
    },
    {
      title: 'Table Navigation',
      icon: <IconTable size={16} />,
      shortcuts: [
        { 
          keys: ['↑'], 
          description: 'Move selection up', 
          icon: <IconArrowUp size={12} />,
          scope: 'table'
        },
        { 
          keys: ['↓'], 
          description: 'Move selection down', 
          icon: <IconArrowDown size={12} />,
          scope: 'table'
        },
        { 
          keys: ['Home'], 
          description: 'Jump to first row', 
          icon: <IconArrowBarUp size={12} />,
          scope: 'table'
        },
        { 
          keys: ['End'], 
          description: 'Jump to last row', 
          icon: <IconArrowBarDown size={12} />,
          scope: 'table'
        },
        { 
          keys: ['Enter'], 
          description: 'Open selected event details', 
          icon: <IconArrowRight size={12} />,
          scope: 'table'
        },
        { 
          keys: ['Space'], 
          description: 'Select/deselect row for bulk actions',
          scope: 'table'
        }
      ]
    },
    {
      title: 'Common Actions',
      icon: <IconArrowsMaximize size={16} />,
      shortcuts: [
        { 
          keys: ['/'], 
          description: 'Focus search box', 
          icon: <IconSearch size={12} />,
          scope: 'global'
        },
        { 
          keys: [modKey, 'r'], 
          description: 'Refresh data', 
          icon: <IconRefresh size={12} />,
          scope: 'global'
        },
        { 
          keys: ['Esc'], 
          description: 'Clear selection or close dialog',
          scope: 'global'
        },
        { 
          keys: ['?'], 
          description: 'Open this shortcuts help',
          scope: 'global'
        },
        { 
          keys: [modKey, 'f'], 
          description: 'Find in page',
          scope: 'global'
        }
      ]
    },
    {
      title: 'Event Details',
      icon: <IconBulb size={16} />,
      shortcuts: [
        { 
          keys: ['e'], 
          description: 'Explain with AI',
          scope: 'event'
        },
        { 
          keys: ['c'], 
          description: 'Copy event ID',
          scope: 'event'
        },
        { 
          keys: ['j'], 
          description: 'Next event in list',
          scope: 'event'
        },
        { 
          keys: ['k'], 
          description: 'Previous event in list',
          scope: 'event'
        }
      ]
    },
    {
      title: 'Deadlock Visualization',
      icon: <IconDeviceDesktop size={16} />,
      shortcuts: [
        { 
          keys: ['+'], 
          description: 'Zoom in',
          scope: 'deadlock'
        },
        { 
          keys: ['-'], 
          description: 'Zoom out',
          scope: 'deadlock'
        },
        { 
          keys: ['0'], 
          description: 'Reset zoom',
          scope: 'deadlock'
        },
        { 
          keys: ['f'], 
          description: 'Toggle fullscreen',
          scope: 'deadlock'
        },
        { 
          keys: ['s'], 
          description: 'Save graph as image',
          scope: 'deadlock'
        },
        { 
          keys: ['r'], 
          description: 'Reset graph layout',
          scope: 'deadlock'
        }
      ]
    }
  ];
  
  // Render a keyboard key with proper styling
  const renderKey = (key: string): JSX.Element => (
    <Kbd key={key} style={{ margin: '0 2px' }}>{key}</Kbd>
  );
  
  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group>
          <ThemeIcon variant="light" color="blue">
            <IconKeyboard size={16} />
          </ThemeIcon>
          <Text fw={600}>Keyboard Shortcuts</Text>
        </Group>
      }
      size="lg"
    >
      <Tabs defaultValue="navigation">
        <Tabs.List mb="md">
          <Tabs.Tab value="navigation" leftSection={<IconNavigation size={16} />}>
            Navigation
          </Tabs.Tab>
          <Tabs.Tab value="actions" leftSection={<IconArrowsMaximize size={16} />}>
            Actions
          </Tabs.Tab>
          <Tabs.Tab value="tables" leftSection={<IconTable size={16} />}>
            Tables
          </Tabs.Tab>
          <Tabs.Tab value="about" leftSection={<IconInfoCircle size={16} />}>
            About
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="navigation">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Dexter supports keyboard shortcuts to help you navigate between different screens quickly.
            </Text>
            
            <Paper withBorder p="sm" radius="md">
              <Text fw={600} mb="xs">Global Navigation</Text>
              <Table>
                <tbody>
                  {shortcutSections[0].shortcuts.map((shortcut, j) => (
                    <tr key={`nav-${j}`}>
                      <td style={{ width: '40%' }}>
                        <Group gap={4}>
                          {shortcut.keys.map(renderKey)}
                        </Group>
                      </td>
                      <td>
                        <Group gap="xs">
                          {shortcut.icon && (
                            <ThemeIcon
                              variant="light"
                              color="gray"
                              size="xs"
                              radius="sm"
                            >
                              {shortcut.icon}
                            </ThemeIcon>
                          )}
                          <Text size="sm">{shortcut.description}</Text>
                          <Badge size="xs" color="blue" variant="light">global</Badge>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="actions">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Use these shortcuts to perform common actions more efficiently.
            </Text>
            
            <Paper withBorder p="sm" radius="md">
              <Text fw={600} mb="xs">Common Actions</Text>
              <Table>
                <tbody>
                  {shortcutSections[2].shortcuts.map((shortcut, j) => (
                    <tr key={`action-${j}`}>
                      <td style={{ width: '40%' }}>
                        <Group gap={4}>
                          {shortcut.keys.map(renderKey)}
                        </Group>
                      </td>
                      <td>
                        <Group gap="xs">
                          {shortcut.icon && (
                            <ThemeIcon
                              variant="light"
                              color="gray"
                              size="xs"
                              radius="sm"
                            >
                              {shortcut.icon}
                            </ThemeIcon>
                          )}
                          <Text size="sm">{shortcut.description}</Text>
                          {shortcut.scope && (
                            <Badge size="xs" color="blue" variant="light">{shortcut.scope}</Badge>
                          )}
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>
            
            <Paper withBorder p="sm" radius="md">
              <Text fw={600} mb="xs">Event Details</Text>
              <Table>
                <tbody>
                  {shortcutSections[3].shortcuts.map((shortcut, j) => (
                    <tr key={`event-${j}`}>
                      <td style={{ width: '40%' }}>
                        <Group gap={4}>
                          {shortcut.keys.map(renderKey)}
                        </Group>
                      </td>
                      <td>
                        <Group gap="xs">
                          {shortcut.icon && (
                            <ThemeIcon
                              variant="light"
                              color="gray"
                              size="xs"
                              radius="sm"
                            >
                              {shortcut.icon}
                            </ThemeIcon>
                          )}
                          <Text size="sm">{shortcut.description}</Text>
                          {shortcut.scope && (
                            <Badge size="xs" color="violet" variant="light">{shortcut.scope}</Badge>
                          )}
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="tables">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              These shortcuts help you navigate tables and visualizations efficiently.
            </Text>
            
            <Paper withBorder p="sm" radius="md">
              <Text fw={600} mb="xs">Table Navigation</Text>
              <Table>
                <tbody>
                  {shortcutSections[1].shortcuts.map((shortcut, j) => (
                    <tr key={`table-${j}`}>
                      <td style={{ width: '40%' }}>
                        <Group gap={4}>
                          {shortcut.keys.map(renderKey)}
                        </Group>
                      </td>
                      <td>
                        <Group gap="xs">
                          {shortcut.icon && (
                            <ThemeIcon
                              variant="light"
                              color="gray"
                              size="xs"
                              radius="sm"
                            >
                              {shortcut.icon}
                            </ThemeIcon>
                          )}
                          <Text size="sm">{shortcut.description}</Text>
                          {shortcut.scope && (
                            <Badge size="xs" color="green" variant="light">{shortcut.scope}</Badge>
                          )}
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>
            
            <Paper withBorder p="sm" radius="md">
              <Text fw={600} mb="xs">Deadlock Visualization</Text>
              <Table>
                <tbody>
                  {shortcutSections[4].shortcuts.map((shortcut, j) => (
                    <tr key={`deadlock-${j}`}>
                      <td style={{ width: '40%' }}>
                        <Group gap={4}>
                          {shortcut.keys.map(renderKey)}
                        </Group>
                      </td>
                      <td>
                        <Group gap="xs">
                          {shortcut.icon && (
                            <ThemeIcon
                              variant="light"
                              color="gray"
                              size="xs"
                              radius="sm"
                            >
                              {shortcut.icon}
                            </ThemeIcon>
                          )}
                          <Text size="sm">{shortcut.description}</Text>
                          {shortcut.scope && (
                            <Badge size="xs" color="indigo" variant="light">{shortcut.scope}</Badge>
                          )}
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="about">
          <Stack gap="md">
            <Paper withBorder p="md">
              <Text fw={600} size="lg" mb="sm">About Keyboard Navigation</Text>
              <Text size="sm">
                Keyboard shortcuts help you work more efficiently in Dexter by reducing the need for mouse interactions. 
                Press <Kbd>?</Kbd> anywhere in the application to bring up this shortcuts guide.
              </Text>
            </Paper>
            
            <Paper withBorder p="md">
              <Text fw={600} mb="sm">Tips for Using Keyboard Shortcuts</Text>
              <Box component="ul" ml="md">
                <li>
                  <Text size="sm" mb="xs">
                    Most global shortcuts use <Kbd>{modKey}</Kbd> + a letter
                  </Text>
                </li>
                <li>
                  <Text size="sm" mb="xs">
                    Component-specific shortcuts are usually single keys
                  </Text>
                </li>
                <li>
                  <Text size="sm" mb="xs">
                    Press <Kbd>Esc</Kbd> to close dialogs or cancel operations
                  </Text>
                </li>
                <li>
                  <Text size="sm">
                    Keyboard shortcuts don't work when focus is in a text input field
                  </Text>
                </li>
              </Box>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
      
      <Divider my="md" />
      
      <Group justify="flex-end">
        <Text size="xs" c="dimmed">
          Press <Kbd>Esc</Kbd> to close this guide
        </Text>
        <Button onClick={handleClose}>Close</Button>
      </Group>
    </Modal>
  );
}

export default KeyboardShortcutsGuide;