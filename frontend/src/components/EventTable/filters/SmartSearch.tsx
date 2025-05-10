import React from 'react';
import { ActionIcon, Box, TextInput, Tooltip } from '@mantine/core';
import { IconSearch, IconSettings, IconX } from '@tabler/icons-react';

interface SmartSearchProps {
  value: string;
  onChange: (value: string) => void;
  onAdvancedClick?: () => void;
  placeholder?: string;
  loading?: boolean;
}

/**
 * Simple smart search input component
 * 
 * Provides search input with settings button for advanced filters
 */
export const SmartSearch: React.FC<SmartSearchProps> = ({
  value,
  onChange,
  onAdvancedClick,
  placeholder = 'Search events...',
  loading = false
}) => {
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape key - clear search
    if (e.key === 'Escape' && value) {
      onChange('');
      e.preventDefault();
    }
  };
  
  // Clear search value
  const clearSearch = () => {
    onChange('');
  };
  
  return (
    <Box style={{ position: 'relative' }}>
      <TextInput
        id="event-search"
        leftSection={loading ? <div className="spinner-border spinner-border-sm" /> : <IconSearch size={16} />}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        radius="md"
        rightSection={
          <Box style={{ display: 'flex', gap: '4px' }}>
            {value && (
              <ActionIcon 
                size="sm" 
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <IconX size={14} />
              </ActionIcon>
            )}
            <Tooltip label="Advanced filters">
              <ActionIcon 
                size="sm" 
                onClick={onAdvancedClick}
                aria-label="Advanced filters"
              >
                <IconSettings size={14} />
              </ActionIcon>
            </Tooltip>
          </Box>
        }
        rightSectionWidth={value ? 64 : 36}
        style={{ width: '100%' }}
        aria-label="Search events"
      />
    </Box>
  );
};

export default SmartSearch;