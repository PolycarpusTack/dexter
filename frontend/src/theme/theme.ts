// File: frontend/src/theme/theme.ts

import { MantineThemeOverride } from '@mantine/core';

/**
 * Dexter application theme configuration
 * Modern, clean UI inspired by VSCode/Notion with improved consistency
 * Uses a system of design tokens for colors, typography, spacing, and shadows
 */

// Define a color palette with semantic naming
const colors = {
  // Primary brand colors with accessible variants - using a slightly desaturated blue
  primary: {
    50: '#ecf5ff',
    100: '#dcedff',
    200: '#c4ddff',
    300: '#90beff',
    400: '#5a9eff',
    500: '#3b82f6',  // Primary brand color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary accent color for highlights and CTAs - modern emerald tone
  accent: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',  // Accent color
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  // Error, warning, success, info colors with proper contrast
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Error color
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Warning color
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',  // Success color
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Info color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Neutral colors for text, backgrounds, borders - cooler VSCode-like grays
  neutral: {
    50: '#f9fafb',   // Background lightest
    100: '#f3f4f6',  // Background light / card
    200: '#e5e7eb',  // Background / hover
    300: '#d1d5db',  // Border light
    400: '#9ca3af',  // Border / disabled
    500: '#6b7280',  // Text disabled / placeholder
    600: '#4b5563',  // Text secondary
    700: '#374151',  // Text primary
    800: '#1f2937',  // Text dark / headings
    900: '#111827',  // Text darkest
  },
};

// Font settings
const fontConfig = {
  fontFamily: 
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  
  headings: {
    fontFamily: 
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    fontWeight: 600,
    lineHeight: 1.35,
  },
  
  // Font sizes in rem units for better scaling
  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    md: '1rem',       // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
};

// Spacing scale in rem units for consistency
const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '2.5rem', // 40px
  '3xl': '3rem',   // 48px
};

// Border radius configuration - more modern, slightly rounder
const radius = {
  xs: '0.125rem', // 2px
  sm: '0.25rem',  // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem',   // 8px
  xl: '0.75rem',  // 12px
  full: '9999px', // Fully rounded (for pills, avatars)
};

// Shadows configuration - softer, modern shadows
const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.03), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
};

// Button styles for consistent interactive elements
const buttonStyles = {
  root: {
    // Default button
    backgroundColor: colors.primary[500],
    color: 'white',
    fontSize: fontConfig.fontSizes.sm,
    fontWeight: 500,
    height: '2.25rem',
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: radius.md,
    transition: 'all 0.15s ease',
    
    '&:hover': {
      backgroundColor: colors.primary[600],
    },
    
    '&:active': {
      backgroundColor: colors.primary[700],
      transform: 'translateY(1px)',
    },
    
    '&:focus': {
      outlineColor: `${colors.primary[300]}`,
      outlineWidth: '2px',
      outlineOffset: '2px',
    },
    
    '&:disabled': {
      backgroundColor: colors.neutral[200],
      color: colors.neutral[500],
      cursor: 'not-allowed',
    },
  },
  
  // Variant styles
  variants: {
    light: {
      backgroundColor: colors.primary[50],
      color: colors.primary[700],
      '&:hover': {
        backgroundColor: colors.primary[100],
      },
    },
    
    outline: {
      backgroundColor: 'transparent',
      color: colors.primary[600],
      border: `1px solid ${colors.primary[300]}`,
      '&:hover': {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[400],
      },
    },
    
    subtle: {
      backgroundColor: 'transparent',
      color: colors.primary[600],
      '&:hover': {
        backgroundColor: colors.primary[50],
      },
    },
    
    // VSCode-style default button
    default: {
      backgroundColor: colors.neutral[100],
      color: colors.neutral[800],
      border: `1px solid ${colors.neutral[300]}`,
      boxShadow: shadows.xs,
      '&:hover': {
        backgroundColor: colors.neutral[200],
        borderColor: colors.neutral[400],
      },
    },
  },
  
  // Size variants
  sizes: {
    xs: {
      height: '1.5rem',
      fontSize: fontConfig.fontSizes.xs,
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: radius.sm,
    },
    
    sm: {
      height: '1.875rem',
      fontSize: fontConfig.fontSizes.sm,
      padding: `${spacing.xs} ${spacing.md}`,
    },
    
    lg: {
      height: '2.5rem',
      fontSize: fontConfig.fontSizes.md,
      padding: `${spacing.sm} ${spacing.xl}`,
    },
  },
};

// Define the complete theme configuration with TypeScript type
export const dexterTheme: MantineThemeOverride = {
  colorScheme: 'light',
  colors: {
    // Set primary color as an array for Mantine compatibility
    blue: [
      colors.primary[50],
      colors.primary[100],
      colors.primary[200], 
      colors.primary[300],
      colors.primary[400],
      colors.primary[500],
      colors.primary[600],
      colors.primary[700],
      colors.primary[800],
      colors.primary[900],
    ],
    green: [
      colors.accent[50],
      colors.accent[100],
      colors.accent[200],
      colors.accent[300],
      colors.accent[400],
      colors.accent[500],
      colors.accent[600],
      colors.accent[700],
      colors.accent[800],
      colors.accent[900],
    ],
    // Adding success color array
    emerald: [
      colors.success[50],
      colors.success[100],
      colors.success[200],
      colors.success[300],
      colors.success[400],
      colors.success[500],
      colors.success[600],
      colors.success[700],
      colors.success[800],
      colors.success[900],
    ],
    // Adding info color array
    indigo: [
      colors.info[50],
      colors.info[100],
      colors.info[200],
      colors.info[300],
      colors.info[400],
      colors.info[500],
      colors.info[600],
      colors.info[700],
      colors.info[800],
      colors.info[900],
    ],
    red: [
      colors.error[50],
      colors.error[100],
      colors.error[200],
      colors.error[300],
      colors.error[400],
      colors.error[500],
      colors.error[600],
      colors.error[700],
      colors.error[800],
      colors.error[900],
    ],
    yellow: [
      colors.warning[50],
      colors.warning[100],
      colors.warning[200],
      colors.warning[300],
      colors.warning[400],
      colors.warning[500],
      colors.warning[600],
      colors.warning[700],
      colors.warning[800],
      colors.warning[900],
    ],
    gray: [
      colors.neutral[50],
      colors.neutral[100],
      colors.neutral[200],
      colors.neutral[300],
      colors.neutral[400],
      colors.neutral[500],
      colors.neutral[600],
      colors.neutral[700],
      colors.neutral[800],
      colors.neutral[900],
    ],
    
    // Custom semantic colors - using proper 10-shade arrays
    background: [
      colors.neutral[50], colors.neutral[50], colors.neutral[50], 
      colors.neutral[50], colors.neutral[50], colors.neutral[50],
      colors.neutral[50], colors.neutral[50], colors.neutral[50], 
      colors.neutral[50]
    ],
    surface: [
      colors.neutral[100], colors.neutral[100], colors.neutral[100], 
      colors.neutral[100], colors.neutral[100], colors.neutral[100],
      colors.neutral[100], colors.neutral[100], colors.neutral[100], 
      colors.neutral[100]
    ],
    border: [
      colors.neutral[300], colors.neutral[300], colors.neutral[300], 
      colors.neutral[300], colors.neutral[300], colors.neutral[300],
      colors.neutral[300], colors.neutral[300], colors.neutral[300], 
      colors.neutral[300]
    ],
  },
  
  // Set primary color name (used by Mantine)
  primaryColor: 'blue',
  
  // Font configuration
  fontFamily: fontConfig.fontFamily,
  fontSizes: fontConfig.fontSizes,
  
  // Headings configuration
  headings: fontConfig.headings,
  
  // Spacing and sizing
  spacing,
  radius,
  shadows,
  
  // Component specific overrides
  components: {
    Button: {
      styles: buttonStyles,
    },
    
    // AppShell styling
    AppShell: {
      styles: {
        root: {
          backgroundColor: colors.neutral[50],
        },
        main: {
          backgroundColor: colors.neutral[50],
        },
        header: {
          backgroundColor: 'white',
          borderBottom: `1px solid ${colors.neutral[200]}`,
          boxShadow: shadows.xs,
        },
        navbar: {
          backgroundColor: 'white',
          borderRight: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    
    // NavLink styling
    NavLink: {
      styles: (theme) => ({
        root: {
          borderRadius: radius.sm,
          margin: `${spacing.xs} ${spacing.xs}`,
          color: colors.neutral[700],
          fontWeight: 500,
          
          // Changed to use camelCase dataActive as Mantine expects
          '&[dataActive="true"]': {
            backgroundColor: theme.colors.blue[0],
            color: theme.colors.blue[7],
            fontWeight: 600,
          },
          
          '&:hover': {
            backgroundColor: colors.neutral[100],
          },
        },
      }),
      defaultProps: {
        p: 'xs',
      },
    },
    
    // Paper component with consistent styling
    Paper: {
      styles: {
        root: {
          backgroundColor: 'white',
          borderRadius: radius.md,
          border: `1px solid ${colors.neutral[200]}`,
          boxShadow: 'none',
        },
      },
      defaultProps: {
        p: 'md',
        withBorder: true,
      },
    },
    
    // Card component styling
    Card: {
      styles: {
        root: {
          borderRadius: radius.md,
          border: `1px solid ${colors.neutral[200]}`,
          boxShadow: shadows.xs,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          
          '&:hover': {
            boxShadow: shadows.sm,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    
    // Badge component styling
    Badge: {
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: fontConfig.fontSizes.xs,
          letterSpacing: '0.01em',
        },
      },
      defaultProps: {
        radius: 'sm',
      },
    },
    
    // Tabs styling
    Tabs: {
      styles: (theme) => ({
        tab: {
          fontWeight: 500,
          borderBottom: '2px solid transparent',
          
          // Changed to use camelCase dataActive as Mantine expects
          '&[dataActive="true"]': {
            borderBottomColor: theme.colors.blue[6],
          },
        },
      }),
    },
    
    // Input styling
    TextInput: {
      styles: {
        input: {
          borderColor: colors.neutral[300],
          
          '&:focus': {
            borderColor: colors.primary[400],
            boxShadow: `0 0 0 2px ${colors.primary[100]}`,
          },
        },
      },
    },
    
    // Menu styling
    Menu: {
      styles: {
        dropdown: {
          border: `1px solid ${colors.neutral[200]}`,
          boxShadow: shadows.md,
        },
        item: {
          fontSize: fontConfig.fontSizes.sm,
          color: colors.neutral[700],
          
          // Changed to use camelCase dataHovered as Mantine expects
          '&[dataHovered="true"]': {
            backgroundColor: colors.neutral[100],
          },
        },
        label: {
          color: colors.neutral[600],
          fontSize: fontConfig.fontSizes.xs,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        },
      },
    },
    
    // Alert styling
    Alert: {
      styles: {
        root: {
          border: `1px solid transparent`,
          boxShadow: 'none',
        },
        title: {
          fontWeight: 600,
          marginBottom: spacing.xs,
        },
      },
    },
    
    // Modal styling
    Modal: {
      styles: {
        header: {
          backgroundColor: colors.neutral[50],
          borderBottom: `1px solid ${colors.neutral[200]}`,
          padding: spacing.md,
        },
        body: {
          padding: spacing.md,
        },
        title: {
          fontWeight: 600,
        },
      },
    },
    
    // Table styling
    Table: {
      styles: {
        root: {
          'th': {
            backgroundColor: colors.neutral[50],
            fontWeight: 600,
            color: colors.neutral[700],
            fontSize: fontConfig.fontSizes.sm,
            textTransform: 'none',
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${colors.neutral[200]}`,
          },
          'td': {
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${colors.neutral[200]}`,
            fontSize: fontConfig.fontSizes.sm,
          },
          'tbody tr:hover': {
            backgroundColor: colors.neutral[50],
          },
        },
      },
    },
  },
  
  // Default props for components
  defaultProps: {
    Button: {
      radius: 'sm',
      size: 'sm',
    },
    Paper: {
      shadow: 'none',
      radius: 'md',
      p: 'md',
      withBorder: true,
    },
    Badge: {
      radius: 'sm',
      size: 'sm',
      variant: 'light',
    },
  },
  
  // Add CSS Variables Configuration - correctly configured for MantineCssVariables
  cssVariables: {
    include: ['color', 'fontFamily', 'fontSize', 'radius', 'spacing', 'shadow'],
    variables: {
      // Add explicit color mappings for light mode
      '--mantine-color-primary': colors.primary[500],
      '--mantine-color-accent': colors.accent[500],
      '--mantine-color-success': colors.success[500],
      '--mantine-color-error': colors.error[500],
      '--mantine-color-warning': colors.warning[500],
      '--mantine-color-info': colors.info[500],
      '--mantine-color-text': colors.neutral[800],
      '--mantine-color-background': colors.neutral[50],
      '--mantine-color-surface': colors.neutral[100],
      '--mantine-color-border': colors.neutral[300],
    },
    darkVariables: {},
    defaultColorScheme: 'light',
  },
  
  // Global styles
  globalStyles: (theme) => ({
    body: {
      backgroundColor: theme.colors.gray[0],
      color: colors.neutral[800],
      lineHeight: 1.6,
    },
    
    // Improved focus styles for accessibility
    '*:focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: `${colors.primary[500]}80`, // 50% opacity
      outlineOffset: '2px',
    },
    
    // Remove focus styling for elements that are clicked
    '*:focus:not(:focus-visible)': {
      outline: 'none',
    },
    
    // Scrollbar styling for WebKit browsers
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    
    '::-webkit-scrollbar-track': {
      background: colors.neutral[100],
    },
    
    '::-webkit-scrollbar-thumb': {
      background: colors.neutral[300],
      borderRadius: '4px',
    },
    
    '::-webkit-scrollbar-thumb:hover': {
      background: colors.neutral[400],
    },
    
    // Typography tuning
    h1: { 
      fontSize: fontConfig.fontSizes['3xl'], 
      fontWeight: 700,
      letterSpacing: '-0.02em',
      marginBottom: spacing.lg,
      color: colors.neutral[900],
    },
    h2: { 
      fontSize: fontConfig.fontSizes['2xl'], 
      fontWeight: 600,
      letterSpacing: '-0.01em',
      marginBottom: spacing.md,
      color: colors.neutral[900],
    },
    h3: { 
      fontSize: fontConfig.fontSizes.xl, 
      fontWeight: 600,
      marginBottom: spacing.sm,
      color: colors.neutral[800],
    },
    h4: { 
      fontSize: fontConfig.fontSizes.lg, 
      fontWeight: 600,
      marginBottom: spacing.sm,
      color: colors.neutral[800],
    },
    p: {
      marginBottom: spacing.md,
    },
    a: {
      color: colors.primary[600],
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
    code: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '90%',
      backgroundColor: colors.neutral[100],
      padding: '2px 4px',
      borderRadius: '4px',
    },
    
    // Transition defaults
    '.mantine-transition-fade-enter': {
      opacity: 0,
    },
    '.mantine-transition-fade-enter-active': {
      opacity: 1,
      transition: 'opacity 200ms ease',
    },
    '.mantine-transition-fade-exit': {
      opacity: 1,
    },
    '.mantine-transition-fade-exit-active': {
      opacity: 0,
      transition: 'opacity 200ms ease',
    },
    
    // Define a CSS variable for settings button highlight
    ':root': {
      '--settings-highlight': colors.primary[500],
    },
  }),
};

export default dexterTheme;