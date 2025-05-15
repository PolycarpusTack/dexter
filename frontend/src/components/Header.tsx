// React import required for JSX
import React from 'react';
import { Group, Title, Box, ActionIcon, Menu, Tooltip, Avatar, Badge, Text, ThemeIcon } from '@mantine/core';
import { 
  IconBrain, 
  IconSettings, 
  IconUser, 
  IconSearch, 
  IconKeyboard, 
  IconHelpCircle, 
  IconMoon,
  IconBell,
  IconTerminal
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';

export function Header() {
  const navigate = useNavigate();
  const { activeAIModel } = useAppStore();
  
  const openSettings = () => {
    if (window.openSentrySettings) {
      window.openSentrySettings();
    }
  };
  
  const handleKeyboardHelp = () => {
    // Simulate pressing ? key to open keyboard shortcuts guide
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: '?',
      code: 'KeySlash',
      shiftKey: true,
      bubbles: true
    }));
  };
  
  return (
    <Box h={60} px="md">
      <Group h="100%" justify="space-between">
        {/* Logo and title */}
        <Group gap="xs">
          <ThemeIcon 
            size="md" 
            radius="md" 
            variant="light" 
            color="blue"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.12)'
            }}
          >
            <IconBrain size={20} />
          </ThemeIcon>
          <Title order={4} style={{ fontSize: '1.25rem', color: '#1f2937' }}>Dexter</Title>
          
          {/* Search button - global search */}
          <Tooltip label="Search (Ctrl+P)" position="bottom" openDelay={500}>
            <ActionIcon 
              variant="subtle" 
              aria-label="Search"
              ml="md"
              onClick={() => navigate('/discover')}
              style={{ color: '#4b5563' }}
            >
              <IconSearch size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
        
        {/* Right-side actions */}
        <Group gap="xs">
          {/* AI Model status indicator */}
          {activeAIModel && (
            <Tooltip label="Current AI model" position="bottom">
              <Badge 
                size="sm" 
                variant="dot" 
                color="indigo"
                style={{ 
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {activeAIModel}
              </Badge>
            </Tooltip>
          )}
          
          {/* Keyboard shortcuts button */}
          <Tooltip label="Keyboard shortcuts" position="bottom">
            <ActionIcon 
              variant="subtle" 
              aria-label="Keyboard shortcuts"
              onClick={handleKeyboardHelp}
              style={{ color: '#4b5563' }}
            >
              <IconKeyboard size={18} />
            </ActionIcon>
          </Tooltip>
          
          {/* Settings menu */}
          <Menu 
            position="bottom-end" 
            withArrow 
            arrowPosition="center"
            shadow="md"
            width={220}
          >
            <Menu.Target>
              <ActionIcon 
                variant="subtle"
                aria-label="Settings and user menu"
                size="md"
                className="settings-button"
                style={{ color: '#4b5563' }}
              >
                <IconSettings size={18} />
              </ActionIcon>
            </Menu.Target>
            
            <Menu.Dropdown>
              <Menu.Label>Configuration</Menu.Label>
              
              <Menu.Item 
                leftSection={<IconSettings size={16} />}
                onClick={openSettings}
              >
                Connection Settings
              </Menu.Item>
              
              <Menu.Item 
                leftSection={<IconBrain size={16} />}
                onClick={() => {
                  if (window.openAIModelSettings) {
                    window.openAIModelSettings();
                  }
                }}
              >
                AI Model Settings
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Label>Documentation</Menu.Label>
              
              <Menu.Item
                leftSection={<IconHelpCircle size={16} />}
                onClick={() => navigate('/docs')}
              >
                Help & Documentation
              </Menu.Item>
              
              <Menu.Item
                leftSection={<IconTerminal size={16} />}
                onClick={() => navigate('/api-docs')}
              >
                API Reference
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Item
                leftSection={<IconUser size={16} />}
                disabled
              >
                <Group wrap="nowrap" gap={6}>
                  <Text>User Profile</Text>
                  <Badge size="xs">Soon</Badge>
                </Group>
              </Menu.Item>
              
              <Menu.Item
                leftSection={<IconMoon size={16} />}
                disabled
              >
                <Group wrap="nowrap" gap={6}>
                  <Text>Dark Mode</Text>
                  <Badge size="xs">Soon</Badge>
                </Group>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  );
}
