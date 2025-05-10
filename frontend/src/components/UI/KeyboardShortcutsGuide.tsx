// File: frontend/src/components/UI/KeyboardShortcutsGuide.tsx

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
  Divider
} from '@mantine/core';
import { 
  IconKeyboard, 
  IconSearch, 
  IconArrowUp, 
  IconArrowDown,
  IconArrowBarUp,
  IconArrowBarDown,
  IconArrowRight,
  IconRefresh
} from '@tabler/icons-react';

interface KeyboardShortcutsGuideProps {
  opened: boolean;
  onClose: () => void;
  isMac?: boolean;
}

interface ShortcutSection {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    icon?: React.ReactNode;
  }>;
}

/**
 * Component for displaying keyboard shortcuts guide
 * Shows available keyboard shortcuts organized by category
 */
function KeyboardShortcutsGuide({ 
  opened, 
  onClose,
  isMac = false
}: KeyboardShortcutsGuideProps): JSX.Element {
  
  // Detect MacOS for showing appropriate key symbols
  const modKey = isMac ? '⌘' : 'Ctrl';
  
  // Define shortcut sections
  const shortcutSections: ShortcutSection[] = [
    {
      title: 'Navigation',
      shortcuts: [
        { 
          keys: ['↑'], 
          description: 'Move selection up', 
          icon: <IconArrowUp size={12} />
        },
        { 
          keys: ['↓'], 
          description: 'Move selection down', 
          icon: <IconArrowDown size={12} />
        },
        { 
          keys: ['Home'], 
          description: 'Jump to first row', 
          icon: <IconArrowBarUp size={12} />
        },
        { 
          keys: ['End'], 
          description: 'Jump to last row', 
          icon: <IconArrowBarDown size={12} />
        },
        { 
          keys: ['Enter'], 
          description: 'Open selected event details', 
          icon: <IconArrowRight size={12} />
        }
      ]
    },
    {
      title: 'Actions',
      shortcuts: [
        { 
          keys: ['/'], 
          description: 'Focus search box', 
          icon: <IconSearch size={12} />
        },
        { 
          keys: [modKey, 'R'], 
          description: 'Refresh data', 
          icon: <IconRefresh size={12} />
        },
        { 
          keys: ['Esc'], 
          description: 'Clear selection or close dialog' 
        },
        { 
          keys: ['?'], 
          description: 'Open this shortcuts help' 
        }
      ]
    },
    {
      title: 'Deadlock Visualization',
      shortcuts: [
        { 
          keys: ['+'], 
          description: 'Zoom in' 
        },
        { 
          keys: ['-'], 
          description: 'Zoom out' 
        },
        { 
          keys: ['0'], 
          description: 'Reset zoom' 
        },
        { 
          keys: ['f'], 
          description: 'Toggle fullscreen' 
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
      onClose={onClose}
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
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Dexter supports keyboard shortcuts to help you navigate and perform actions quickly.
        </Text>
        
        {shortcutSections.map((section, i) => (
          <Paper key={section.title} withBorder p="sm" radius="md">
            <Text fw={600} mb="xs">{section.title}</Text>
            <Table>
              <tbody>
                {section.shortcuts.map((shortcut, j) => (
                  <tr key={`${i}-${j}`}>
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
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Paper>
        ))}
        
        <Divider />
        
        <Group justify="flex-end">
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default KeyboardShortcutsGuide;