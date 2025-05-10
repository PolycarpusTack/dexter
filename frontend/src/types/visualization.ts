// File: src/types/visualization.ts

import { SimulationNodeDatum } from 'd3-force';

/**
 * Interface for visualization node data in D3 graphs
 */
export interface VisualizationNode extends SimulationNodeDatum {
  id: string | number;
  type: string;
  label: string;
  inCycle?: boolean;
  application?: string;
  username?: string;
  query?: string;
  locks_held?: string[];
  locks_waiting?: string[];
  tables?: string[];
  queryFingerprint?: string;
  x?: number | undefined;
  y?: number | undefined;
  fx?: number | null;
  fy?: number | null;
}

/**
 * Interface for visualization edge data in D3 graphs
 */
export interface VisualizationEdge {
  source: string | number | VisualizationNode;
  target: string | number | VisualizationNode;
  label?: string;
  inCycle?: boolean;
  details?: string;
}

/**
 * Interface for graph data structure
 */
export interface GraphData {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  cycles?: string[][];
  severity?: number;
  tables?: Record<string, {
    accessPattern?: string;
  }>;
}

/**
 * Interface for visualization options
 */
export interface VisualizationOptions {
  layout: string;
  physicsEnabled: boolean;
  chargeStrength: number;
  theme: any;
  rgba: (color: string, alpha?: number) => string;
}
