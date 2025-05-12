import { MantineTheme } from '@mantine/core';

/**
 * Node in the visualization graph
 */
export interface VisualizationNode {
  id: string | number;
  type: 'process' | 'table' | string;
  label: string;
  inCycle?: boolean;
  x?: number;
  y?: number;
  applicationName?: string;
  username?: string;
  query?: string;
  locks_held?: string[];
  locks_waiting?: string[];
  tables?: string[];
  queryFingerprint?: string;
}

/**
 * Edge in the visualization graph
 */
export interface VisualizationEdge {
  source: string | number | VisualizationNode;
  target: string | number | VisualizationNode;
  label?: string;
  inCycle?: boolean;
  details?: string;
}

/**
 * Data for the graph visualization
 */
export interface GraphData {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  cycles?: number[][];
  severity?: number;
  pattern?: string;
}

/**
 * Options for the visualization
 */
export interface VisualizationOptions {
  layout?: 'force' | 'circular' | 'dagre';
  physicsEnabled?: boolean;
  chargeStrength?: number;
  theme: MantineTheme;
  rgba: (color: string | number[] | undefined, alpha?: number) => string;
}

/**
 * Helper function to convert color to rgba
 * This replaces theme.fn.rgba which isn't available in our Mantine version
 */
export function rgba(color: string | number[] | undefined, alpha = 1): string {
  // Handle undefined or null color
  if (!color) {
    return `rgba(128, 128, 128, ${alpha})`;
  }
  
  // If color is an array (like from Mantine theme colors)
  if (Array.isArray(color)) {
    // Check if it's an RGB array
    if (color.length >= 3) {
      const [r = 0, g = 0, b = 0] = color;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Invalid array, use default
    return `rgba(128, 128, 128, ${alpha})`;
  }
  
  // If color is a string
  if (typeof color === 'string') {
    // If color is already rgba, just update the alpha
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, `${alpha})`);
    }
    
    // If color is rgb, convert to rgba
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    
    // If color is hex, convert to rgba
    if (color.startsWith('#')) {
      let r = 0, g = 0, b = 0;
      
      // Convert hex to rgb
      if (color.length === 4) {
        // #RGB format
        const r1 = color.charAt(1);
        const g1 = color.charAt(2);
        const b1 = color.charAt(3);
        r = parseInt(r1 + r1, 16) || 0;
        g = parseInt(g1 + g1, 16) || 0;
        b = parseInt(b1 + b1, 16) || 0;
      } else if (color.length === 7) {
        // #RRGGBB format
        r = parseInt(color.substring(1, 3), 16) || 0;
        g = parseInt(color.substring(3, 5), 16) || 0;
        b = parseInt(color.substring(5, 7), 16) || 0;
      } else {
        // Invalid format, use default gray color
        return `rgba(128, 128, 128, ${alpha})`;
      }
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  
  // Default fallback
  return `rgba(128, 128, 128, ${alpha})`;
}

export default {
  rgba
};
