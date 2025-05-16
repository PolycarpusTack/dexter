// Add module declaration to avoid import errors with @mantine/styles
declare module '@mantine/styles' {
  // Export anything that might be imported from @mantine/styles
  export const createStyles: any;
  export const Global: any;
  export const keyframes: any;
  export const MantineProvider: any;
  export const ColorSchemeProvider: any;
  export const useColorScheme: any;
}