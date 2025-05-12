// File: frontend/src/theme/theme.js

/**
 * Dexter application theme configuration
 * Configures colors, typography, spacing, and other visual elements
 * for a consistent, accessible UI
 */

// Define a color palette with semantic naming
const colors = {
  // Primary brand colors with accessible variants
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',  // Primary brand color
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  
  // Secondary accent color for highlights and CTAs
  accent: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',  // Accent color
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  
  // Error, warning, success, info colors with proper contrast
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    300: '#e57373',
    500: '#f44336',  // Error color
    700: '#d32f2f',
    900: '#b71c1c',
  },
  
  warning: {
    50: '#fff8e1',
    100: '#ffecb3',
    300: '#ffd54f',
    500: '#ffc107',  // Warning color
    700: '#ffa000',
    900: '#ff6f00',
  },
  
  success: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    300: '#81c784',
    500: '#4caf50',  // Success color
    700: '#388e3c',
    900: '#1b5e20',
  },
  
  info: {
    50: '#e3f2fd',
    100: '#bbdefb',
    300: '#64b5f6',
    500: '#2196f3',  // Info color
    700: '#1976d2',
    900: '#0d47a1',
  },
  
  // Neutral colors for text, backgrounds, borders
  neutral: {
    50: '#fafafa',  // Background lightest
    100: '#f5f5f5',  // Background light
    200: '#eeeeee',  // Background
    300: '#e0e0e0',  // Border light
    400: '#bdbdbd',  // Border
    500: '#9e9e9e',  // Text disabled
    600: '#757575',  // Text secondary
    700: '#616161',  // Text primary
    800: '#424242',  // Text dark
    900: '#212121',  // Text darkest
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

// Border radius configuration
const radius = {
  xs: '0.125rem', // 2px
  sm: '0.25rem',  // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem',   // 8px
  xl: '0.75rem',  // 12px
  full: '9999px', // Fully rounded (for pills, avatars)
};

// Shadows configuration
const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// Button styles for consistent interactive elements
const buttonStyles = {
  root: {
    // Default button
    backgroundColor: colors.primary[500],
    color: 'white',
    fontSize: fontConfig.fontSizes.sm,
    fontWeight: 600,
    height: '2.5rem',
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: radius.md,
    transition: 'all 0.2s ease',
    
    '&:hover': {
      backgroundColor: colors.primary[600],
    },
    
    '&:active': {
      backgroundColor: colors.primary[700],
    },
    
    '&:focus': {
      outlineColor: colors.primary[300],
    },
    
    '&:disabled': {
      backgroundColor: colors.neutral[300],
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
      color: colors.primary[500],
      border: `1px solid ${colors.primary[500]}`,
      '&:hover': {
        backgroundColor: colors.primary[50],
      },
    },
    
    subtle: {
      backgroundColor: 'transparent',
      color: colors.primary[500],
      '&:hover': {
        backgroundColor: colors.primary[50],
      },
    },
  },
  
  // Size variants
  sizes: {
    xs: {
      height: '1.75rem',
      fontSize: fontConfig.fontSizes.xs,
      padding: `${spacing.xs} ${spacing.sm}`,
    },
    
    sm: {
      height: '2.25rem',
      fontSize: fontConfig.fontSizes.sm,
      padding: `${spacing.xs} ${spacing.md}`,
    },
    
    lg: {
      height: '2.75rem',
      fontSize: fontConfig.fontSizes.md,
      padding: `${spacing.sm} ${spacing.xl}`,
    },
  },
};

// Define a complete theme configuration
export const dexterTheme = {
  colorScheme: 'light',
  colors: {
    // Set primary color as an array for Mantine v7 compatibility
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
    red: [
      colors.error[50],
      colors.error[100],
      colors.error[300],
      '#f56565', // Added intermediate shade
      colors.error[500],
      colors.error[700],
      colors.error[900],
      '#7f1d1d', // Added dark shade
      '#630f0f', // Added darker shade
      '#4a0b0b', // Added darkest shade
    ],
    yellow: [
      colors.warning[50],
      colors.warning[100],
      colors.warning[300],
      '#f6c244', // Added intermediate shade
      colors.warning[500],
      colors.warning[700],
      colors.warning[900],
      '#975a00', // Added dark shade
      '#7c4a00', // Added darker shade
      '#613b00', // Added darkest shade
    ],
    
    // Background colors
    background: colors.neutral[50],
    surface: 'white',
    border: colors.neutral[300],
  },
  
  // Set primary color name (used by Mantine)
  primaryColor: 'blue',
  
  // Font configuration
  fontFamily: fontConfig.fontFamily,
  fontSizes: fontConfig.fontSizes,
  
  // Headings configuration
  headings: fontConfig.headings,
  
  // Spacing and sizing
  spacing: spacing,
  radius: radius,
  shadows: shadows,
  
  // Component specific overrides
  components: {
    Button: {
      styles: buttonStyles,
    },
    
    // Paper component with consistent styling
    Paper: {
      styles: {
        root: {
          backgroundColor: 'white',
          borderRadius: radius.md,
          padding: spacing.md,
        },
      },
    },
    
    // Card component styling
    Card: {
      styles: {
        root: {
          borderRadius: radius.md,
          boxShadow: shadows.sm,
        },
      },
    },
    
    // Badge component styling
    Badge: {
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: fontConfig.fontSizes.xs,
        },
      },
    },
  },
  
  // Default props for components
  defaultProps: {
    Button: {
      radius: 'md',
    },
    Paper: {
      shadow: 'sm',
      radius: 'md',
      p: 'md',
    },
  },
  
  // Global styles
  globalStyles: (theme) => ({
    body: {
      backgroundColor: theme.colors.background,
      color: colors.neutral[800],
      lineHeight: 1.6,
    },
    
    // Improved focus styles for accessibility
    '*:focus': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: `${colors.primary[500]}80`, // 50% opacity
      outlineOffset: '2px',
    },
  }),
};

export default dexterTheme;