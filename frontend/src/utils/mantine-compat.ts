/**
 * Mantine compatibility layer
 * 
 * This file provides backward compatibility for code that uses
 * the old Mantine API (v6) with the new Mantine (v7+).
 */

import { useMantineTheme, MantineTheme } from '@mantine/core';

/**
 * Compatibility replacement for the useTheme hook
 * In Mantine v7, useTheme was renamed to useMantineTheme
 * and colorScheme was replaced with dark boolean
 */
export function useTheme(): MantineTheme & { colorScheme: 'light' | 'dark' } {
  const theme = useMantineTheme();
  return {
    ...theme,
    // Add back colorScheme for backward compatibility
    colorScheme: theme.dark ? 'dark' : 'light'
  };
}

/**
 * Converts theme.colorScheme check to theme.dark
 * In Mantine v7, theme.colorScheme was replaced with theme.dark boolean
 * 
 * @param colorScheme - The color scheme string ('dark' or 'light')
 * @returns Whether the scheme is dark
 */
export function isDarkScheme(colorScheme: string): boolean {
  return colorScheme === 'dark';
}

// Export all from Mantine core for convenience
export * from '@mantine/core';