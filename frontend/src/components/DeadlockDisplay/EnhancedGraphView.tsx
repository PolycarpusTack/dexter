// frontend/src/components/DeadlockDisplay/EnhancedGraphView.tsx

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Paper, 
  Text, 
  Loader, 
  useMantineTheme, 
  Tooltip, 
  Group,
  Badge,
  Box,
  ActionIcon,
  Select,
  Checkbox,
  Switch,
  HoverCard,
  Slider,
  RingProgress,
  ThemeIcon,
  MantineTheme
} from '@mantine/core';
import * as d3 from 'd3';
import { Simulation, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import { 
  IconMaximize, 
  IconMinimize, 
  IconReload, 
  IconZoomIn, 
  IconZoomOut,
  IconDatabase,
  IconLock,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChartBar,
  IconX,
  IconAlertTriangle,
  IconInfoCircle
} from '@tabler/icons-react';
import { DeadlockVisualizationData } from '../../types/deadlock';

import { 
  VisualizationNode, 
  VisualizationEdge, 
  GraphData, 
  VisualizationOptions 
} from '../../types/visualization';

interface SimulationNode extends SimulationNodeDatum, Omit<VisualizationNode, 'x' | 'y'> {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

interface SimulationLink extends SimulationLinkDatum<SimulationNode> {
  source: SimulationNode | string | number;
  target: SimulationNode | string | number;
  label?: string;
  inCycle?: boolean;
  details?: string;
}

interface EnhancedGraphViewProps {
  data?: GraphData | DeadlockVisualizationData | any; // Allow any temporarily for backward compatibility
  isLoading: boolean;
}

/**
 * Helper function to convert color to rgba
 * This replaces theme.fn.rgba which isn't available in our Mantine version
 */
function rgba(color: string | number[] | undefined, alpha = 1): string {
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

/**
 * Enhanced interactive graph visualization of PostgreSQL deadlock with advanced features
 */
const EnhancedGraphView: React.FC<EnhancedGraphViewProps> = ({ data, isLoading }) => {
  const theme: MantineTheme = useMantineTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [layout, setLayout] = useState<string>('force');
  const [showCyclesOnly, setShowCyclesOnly] = useState<boolean>(false);
  const [showTables, setShowTables] = useState<boolean>(true);
  const [physicsEnabled, setPhysicsEnabled] = useState<boolean>(true);
  const [chargeStrength, setChargeStrength] = useState<number>(-300);
  
  // Severity indicator
  const severityScore = useMemo(() => {
    if (!data || !data.severity) return 0;
    return Math.min(100, Math.max(0, data.severity));
  }, [data]);
  
  const severityColor = useMemo(() => {
    if (severityScore < 30) return theme.colors.green[6];
    if (severityScore < 60) return theme.colors.yellow[6];
    return theme.colors.red[6];
  }, [severityScore, theme.colors]);
  
  const severityLabel = useMemo(() => {
    if (severityScore < 30) return "Low";
    if (severityScore < 60) return "Medium";
    return "High";
  }, [severityScore]);
  
  // Create simulation when data changes
  useEffect(() => {
    if (isLoading || !data || !data.nodes || !data.edges || !svgRef.current) {
      return;
    }
    
    // Get reference to svg using d3
    const svg = d3.select(svgRef.current);
    
    // Use the svg element for tracking its initialization
    if (svg.node()) {
      console.log('SVG element initialized:', svg.node());
    }
    
    // Clear previous visualization
    svg.selectAll('*').remove();
    
    // Filter nodes if showing cycles only
    let filteredNodes = [...data.nodes];
    let filteredEdges = [...data.edges];
    
    if (showCyclesOnly) {
      const nodeIdsInCycle = data.nodes
        .filter((node: VisualizationNode) => node.inCycle)
        .map((node: VisualizationNode) => node.id);
      
      filteredNodes = data.nodes.filter((node: VisualizationNode) => node.inCycle);
      filteredEdges = data.edges.filter((edge: VisualizationEdge) => 
        nodeIdsInCycle.includes(edge.source) && nodeIdsInCycle.includes(edge.target)
      );
    }
    
    // Filter out tables if needed
    if (!showTables) {
      filteredNodes = filteredNodes.filter((node: VisualizationNode) => node.type !== 'table');
      filteredEdges = filteredEdges.filter((edge: VisualizationEdge) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.toString();
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.toString();
        return !sourceId.includes('table_') && !targetId.includes('table_');
      });
    }
    
    const visualizationData = {
      nodes: filteredNodes,
      edges: filteredEdges,
      cycles: data.cycles
    };
    
    // Display cycles information if available
    const cycles = data.cycles || [];
    console.log(`Detected ${cycles.length} deadlock cycles in the data`);
    
    createDeadlockVisualization(
      svgRef.current, 
      visualizationData, 
      tooltipRef.current!,
      {
        layout,
        physicsEnabled,
        chargeStrength,
        theme,
        rgba
      }
    );
    
    // Clean up when component unmounts or when dependencies change
    return () => {
      if (svgRef.current) {
        // Stop any running simulations
        const svgElement = d3.select(svgRef.current);
        const simulation = svgElement.datum() as d3.Simulation<VisualizationNode, VisualizationEdge> | null;
        if (simulation && typeof simulation.stop === 'function') {
          simulation.stop();
        }
      }
    };
  }, [data, isLoading, layout, theme, showCyclesOnly, showTables, physicsEnabled, chargeStrength]);
  
  // Handle layout changes
  const handleLayoutChange = (value: string | null) => {
    if (value) {
      setLayout(value);
    }
  };
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const currentTransform = d3.zoomTransform(svg.node()!);
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k * 1.25)
      );
    }
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const currentTransform = d3.zoomTransform(svg.node()!);
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k * 0.8)
      );
    }
  };
  
  // Handle reset
  const handleReset = () => {
    setZoomLevel(1);
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity
      );
    }
  };
  
  // Toggle fullscreen
  const handleFullscreenToggle = () => {
    setFullscreen(!fullscreen);
    // If entering fullscreen, maximize the view
    if (!fullscreen && svgRef.current) {
      const svg = d3.select(svgRef.current);
      const bounds = (svg.select('g').node() as SVGGraphicsElement | null)?.getBBox();
      if (bounds) {
        zoomToFit(svg, svg.select('g'), 0.9);
      }
    }
  };
  
  // Handle minimize/maximize actions
  const handleMinimize = () => {
    setZoomLevel(0.5);
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity.scale(0.5)
      );
    }
  };
  
  const handleMaximize = () => {
    if (svgRef.current) {
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
      const g = svg.select<SVGGElement>('g');
      zoomToFit(svg, g, 0.95);
    }
  };
  
  // Close the graph view
  const handleClose = () => {
    // This would typically be handled by a parent component
    // For now, we'll just minimize
    handleMinimize();
  };
  
  // Export SVG
  const handleExportSVG = () => {
    try {
      if (!svgRef.current) return;
      
      // Use the D3 selection directly
      const svgElement = svgRef.current;
      
      // Make a copy of the SVG
      const svgCopy = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Clean up transform on root group element
      const g = svgCopy.querySelector('g');
      if (g) {
        g.removeAttribute('transform');
      }
      
      // Set attributes needed for standalone SVG
      svgCopy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgCopy.setAttribute('width', svgElement.clientWidth.toString());
      svgCopy.setAttribute('height', svgElement.clientHeight.toString());
      
      // Convert to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgCopy);
      
      // Create blob and download link
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'deadlock-visualization.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting SVG:', error);
    }
  };
  
  return (
    <Paper 
      withBorder
      p="md" 
      radius="md" 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: fullscreen ? 'calc(100vh - 150px)' : '550px',
        transition: 'height 0.3s ease',
        position: 'relative',
        backgroundColor: theme.colors.gray[0]
      }}
    >
      {/* Header with controls */}
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Group gap="xs">
            <Text fw={600}>Deadlock Graph</Text>
            <Tooltip label="Interactive visualization of the deadlock graph" withArrow>
              <ActionIcon size="xs" color="gray" variant="subtle">
                <IconInfoCircle size={12} />
              </ActionIcon>
            </Tooltip>
          </Group>
          {data && data.cycles && data.cycles.length > 0 && (
            <Badge color={severityColor} variant="filled">
              {severityLabel} Severity
            </Badge>
          )}
          
          {/* Severity indicator */}
          {data && data.severity !== undefined && (
            <HoverCard width={200} shadow="md" withArrow>
              <HoverCard.Target>
                <Box>
                  <RingProgress
                    size={36}
                    thickness={3}
                    roundCaps
                    sections={[{ value: severityScore, color: severityColor }]}
                    label={
                      <ThemeIcon color={severityColor} variant="light" radius="xl" size={22}>
                        {severityScore >= 60 ? (
                          <IconAlertTriangle size={12} />
                        ) : (
                          <IconInfoCircle size={12} />
                        )}
                      </ThemeIcon>
                    }
                  />
                </Box>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Text size="sm" fw={500} mb={5}>Deadlock Severity: {severityScore}/100</Text>
                <Text size="xs">
                  Based on factors like the number of transactions, tables involved, 
                  lock types, and the complexity of the deadlock cycle.
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>
          )}
        </Group>
        
        <Group gap="xs">
          {/* Layout selector */}
          <Select
            size="xs"
            value={layout}
            onChange={handleLayoutChange}
            data={[
              { value: 'force', label: 'Force-Directed' },
              { value: 'circular', label: 'Circular' },
              { value: 'dagre', label: 'Hierarchical' }
            ]}
            style={{ width: '120px' }}
          />
          
          {/* Zoom controls */}
          <Tooltip label="Zoom in" withArrow>
            <ActionIcon 
              variant="light"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              aria-label="Zoom in"
            >
              <IconZoomIn size={16} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Zoom out" withArrow>
            <ActionIcon 
              variant="light"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              aria-label="Zoom out"
            >
              <IconZoomOut size={16} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Reset view" withArrow>
            <ActionIcon 
              variant="light"
              onClick={handleReset}
              aria-label="Reset view"
            >
              <IconReload size={16} />
            </ActionIcon>
          </Tooltip>
          
          {/* Minimize view */}
          <Tooltip label="Minimize view" withArrow>
            <ActionIcon 
              variant="light"
              onClick={handleMinimize}
              aria-label="Minimize view"
            >
              <IconMinimize size={16} />
            </ActionIcon>
          </Tooltip>
          
          {/* Maximize view */}
          <Tooltip label="Maximize view" withArrow>
            <ActionIcon 
              variant="light"
              onClick={handleMaximize}
              aria-label="Maximize view"
            >
              <IconArrowsMaximize size={16} />
            </ActionIcon>
          </Tooltip>
          
          {/* Export SVG */}
          <Tooltip label="Export as SVG" withArrow>
            <ActionIcon
              variant="light"
              onClick={handleExportSVG}
              aria-label="Export as SVG"
            >
              <IconChartBar size={16} />
            </ActionIcon>
          </Tooltip>
          
          {/* Fullscreen toggle */}
          <Tooltip label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} withArrow>
            <ActionIcon 
              variant="light"
              onClick={handleFullscreenToggle}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <IconArrowsMinimize size={16} /> : <IconMaximize size={16} />}
            </ActionIcon>
          </Tooltip>
          
          {/* Close button */}
          <Tooltip label="Close graph view" withArrow>
            <ActionIcon 
              variant="light"
              color="red"
              onClick={handleClose}
              aria-label="Close graph view"
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      
      {/* Configuration options */}
      <Group justify="space-between" mb="md" gap="xl">
        <Group gap="md">
          {/* Show only cycles checkbox */}
          <Checkbox
            label={
              <Group gap="xs">
                <IconLock size={14} />
                <Text size="xs">Show deadlock cycle only</Text>
              </Group>
            }
            checked={showCyclesOnly}
            onChange={(event) => setShowCyclesOnly(event.currentTarget.checked)}
            size="xs"
          />
          
          {/* Show tables checkbox */}
          <Checkbox
            label={
              <Group gap="xs">
                <IconDatabase size={14} />
                <Text size="xs">Show tables</Text>
              </Group>
            }
            checked={showTables}
            onChange={(event) => setShowTables(event.currentTarget.checked)}
            size="xs"
          />
        </Group>
        
        <Group gap="md">
          {/* Physics toggle */}
          <Switch
            label="Physics simulation"
            checked={physicsEnabled}
            onChange={(event) => setPhysicsEnabled(event.currentTarget.checked)}
            size="xs"
          />
          
          {/* Force strength slider (only show when physics is enabled) */}
          {physicsEnabled && (
            <Box style={{ width: 120 }}>
              <Text size="xs" mb={5}>Force strength</Text>
              <Slider
                size="xs"
                min={-600}
                max={-100}
                step={50}
                value={chargeStrength}
                onChange={setChargeStrength}
              />
            </Box>
          )}
        </Group>
      </Group>
      
      {/* Graph visualization */}
      <Box 
        style={{ 
          flex: 1, 
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: theme.white,
          borderRadius: theme.radius.sm
        }}
      >
        {isLoading ? (
          <Box 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <Loader />
          </Box>
        ) : !data ? (
          <Box 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <Text c="dimmed">No deadlock data available</Text>
          </Box>
        ) : (
          <>
            <svg 
              ref={svgRef} 
              width="100%" 
              height="100%"
              style={{ display: 'block' }}
            />
            <div 
              ref={tooltipRef}
              style={{
                position: 'absolute',
                display: 'none',
                background: theme.white,
                border: `1px solid ${theme.colors.gray[3]}`,
                padding: '8px',
                borderRadius: '4px',
                boxShadow: theme.shadows.sm,
                fontSize: '12px',
                maxWidth: '300px',
                zIndex: 1000,
                pointerEvents: 'none'
              }}
            />
            
            {/* Legend */}
            <Box
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: rgba(theme.white, 0.9),
                padding: '8px',
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.gray[2]}`,
                fontSize: '12px',
                zIndex: 100
              }}
            >
              <Text size="xs" fw={600} mb={5}>Legend</Text>
              
              <Group gap="xs" mb={5}>
                <Box
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.blue[6]
                  }}
                />
                <Text size="xs">Process</Text>
              </Group>
              
              <Group gap="xs" mb={5}>
                <Box
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.red[6]
                  }}
                />
                <Text size="xs">Process in Deadlock</Text>
              </Group>
              
              <Group gap="xs" mb={5}>
                <Box
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '4px',
                    backgroundColor: theme.colors.gray[5]
                  }}
                />
                <Text size="xs">Table</Text>
              </Group>
              
              <Group gap="xs" mb={5}>
                <Box
                  style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: theme.colors.red[6]
                  }}
                />
                <Text size="xs">Deadlock Relation</Text>
              </Group>
              
              <Group gap="xs">
                <Box
                  style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: theme.colors.gray[5]
                  }}
                />
                <Text size="xs">Table Access</Text>
              </Group>
            </Box>
          </>
        )}
      </Box>
      
      {/* Stats */}
      {data && (
        <Group justify="space-between" mt="xs">
          <Text size="xs" c="dimmed">
            {data.nodes?.filter((n: VisualizationNode) => n.type === 'process').length || 0} Processes,{' '}
            {data.nodes?.filter((n: VisualizationNode) => n.type === 'table').length || 0} Tables,{' '}
            {data.cycles?.length || 0} Cycles
          </Text>
          <Text size="xs" c="dimmed">
            Zoom: {Math.round(zoomLevel * 100)}%
          </Text>
        </Group>
      )}
    </Paper>
  );
};

/**
 * Create the interactive deadlock visualization with enhanced features
 */
function createDeadlockVisualization(
  svgElement: SVGSVGElement, 
  data: GraphData, 
  tooltipElement: HTMLDivElement, 
  options: VisualizationOptions
) {
  const { layout = 'force', physicsEnabled = true, chargeStrength = -300, theme, rgba } = options;
  
  // Create SVG and get dimensions
  const svg = d3.select(svgElement);
  const width = svgElement.clientWidth;
  const height = svgElement.clientHeight;
  
  // Create a group for zoom/pan behavior
  const g = svg.append('g');
  
  // Initialize zoom behavior
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  
  // Apply zoom to SVG
  svg.call(zoom)
     .on('dblclick.zoom', null); // Disable double-click zoom
  
  // Create a tooltip
  const tooltip = d3.select(tooltipElement);
  
  // Extract nodes and edges from data
  const { nodes, edges, cycles } = data;
  
  // Display cycles information
  if (cycles && cycles.length > 0) {
    console.log(`Detected ${cycles.length} deadlock cycles in the data`);
    // Add cycle highlighting if needed
    cycles.forEach((cycle, index) => {
      console.log(`Cycle ${index + 1}:`, cycle);
    });
  }
  
  // Clear any existing contents
  g.selectAll('*').remove();
  
  // Create marker definition for arrows
  const defs = g.append('defs');
  
  // Standard arrow marker
  defs.append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', theme.colors.gray[6]);
  
  // Red arrow marker for cycle
  defs.append('marker')
    .attr('id', 'arrowhead-cycle')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', theme.colors.red[6]);
  
  // Add a shadow filter for highlighting
  defs.append('filter')
    .attr('id', 'highlight-shadow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
    .append('feDropShadow')
    .attr('dx', '0')
    .attr('dy', '0')
    .attr('stdDeviation', '3')
    .attr('flood-color', theme.colors.yellow[5])
    .attr('flood-opacity', '0.8');
  
  // Create a glass background for tables
  defs.append('linearGradient')
    .attr('id', 'table-gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
    .selectAll('stop')
    .data([
      { offset: '0%', color: rgba(theme.colors.gray[2], 0.9) },
      { offset: '100%', color: rgba(theme.colors.gray[4], 0.9) }
    ])
    .enter()
    .append('stop')
    .attr('offset', d => d.offset)
    .attr('stop-color', d => d.color);
  
  // Create a process background gradient
  defs.append('linearGradient')
    .attr('id', 'process-gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
    .selectAll('stop')
    .data([
      { offset: '0%', color: rgba(theme.colors.blue[5], 0.9) },
      { offset: '100%', color: rgba(theme.colors.blue[7], 0.9) }
    ])
    .enter()
    .append('stop')
    .attr('offset', d => d.offset)
    .attr('stop-color', d => d.color);
  
  // Create a deadlock process background gradient
  defs.append('linearGradient')
    .attr('id', 'deadlock-process-gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
    .selectAll('stop')
    .data([
      { offset: '0%', color: rgba(theme.colors.red[5], 0.9) },
      { offset: '100%', color: rgba(theme.colors.red[7], 0.9) }
    ])
    .enter()
    .append('stop')
    .attr('offset', d => d.offset)
    .attr('stop-color', d => d.color);
  
  // Handle node data for the simulation
  const nodesWithPosition: SimulationNode[] = nodes.map((node: VisualizationNode) => ({
    ...node,
    x: node.x ?? 0,
    y: node.y ?? 0
  } as SimulationNode));
  
  // Map nodes and edges for the simulation
  const linksForSimulation = edges.map((edge: VisualizationEdge) => ({
    ...edge,
    source: edge.source,
    target: edge.target
  }));
  
  // Create links (edges)
  const link = g.append('g')
    .selectAll<SVGLineElement, VisualizationEdge>('line')
    .data(edges)
    .enter()
    .append('line')
    .attr('stroke', d => d.inCycle ? theme.colors.red[6] : theme.colors.gray[5])
    .attr('stroke-width', d => d.inCycle ? 2 : 1)
    .attr('stroke-dasharray', d => d.label === 'accesses' ? '3,3' : null)
    .attr('marker-end', d => d.inCycle ? 'url(#arrowhead-cycle)' : 'url(#arrowhead)')
    .attr('opacity', 0.7)
    .on('mouseover', function(event, d) {
      // Show tooltip
      tooltip.style('display', 'block')
        .html(generateEdgeTooltip(d))
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px');
        
      // Highlight this edge
      d3.select<SVGLineElement, VisualizationEdge>(this)
        .attr('stroke-width', d => d.inCycle ? 3 : 2)
        .attr('opacity', 1)
        .attr('filter', 'url(#highlight-shadow)');
    })
    .on('mouseout', function() {
      // Hide tooltip
      tooltip.style('display', 'none');
      
      // Reset edge style
      d3.select<SVGLineElement, VisualizationEdge>(this)
        .attr('stroke-width', d => d.inCycle ? 2 : 1)
        .attr('opacity', 0.7)
        .attr('filter', null);
    });
  
  // Create edge labels
  const edgeLabels = g.append('g')
    .selectAll('text')
    .data(edges.filter((d: VisualizationEdge) => d.label === 'waits for')) // Only show labels for wait relationships
    .enter()
    .append('text')
    .attr('font-size', '10px')
    .attr('text-anchor', 'middle')
    .attr('dy', -5)
    .attr('fill', theme.colors.gray[7])
    .text((d: VisualizationEdge) => d.label || '');
  
  // Create nodes
  const node = g.append('g')
    .selectAll<SVGGElement, SimulationNode>('g')
    .data(nodesWithPosition)
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(d3.drag<SVGGElement, SimulationNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    )
    .on('mouseover', function(event: MouseEvent, d: VisualizationNode) {
      // Show tooltip with node info
      tooltip.style('display', 'block')
        .html(generateNodeTooltip(d))
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px');
      
      // Highlight node
      d3.select(this)
        .attr('filter', 'url(#highlight-shadow)');
      
      // Highlight connected edges
      link.each(function(l) {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        if (sourceId === d.id || targetId === d.id) {
          d3.select<SVGLineElement, VisualizationEdge>(this)
            .attr('stroke-width', edge => edge.inCycle ? 3 : 2)
            .attr('opacity', 1);
        }
      });
    })
    .on('mouseout', function() {
      // Hide tooltip
      tooltip.style('display', 'none');
      
      // Reset node style
      d3.select(this)
        .attr('filter', null);
      
      // Reset all edge styles
      link
        .attr('stroke-width', (d: VisualizationEdge) => d.inCycle ? 2 : 1)
        .attr('opacity', 0.7);
    });
  
  // Add shapes to nodes based on type
  node.each(function(d: VisualizationNode) {
    if (d.type === 'process') {
      // Processes are circles
      d3.select(this).append('circle')
        .attr('r', 25)
        .attr('fill', d.inCycle ? 'url(#deadlock-process-gradient)' : 'url(#process-gradient)')
        .attr('stroke', d.inCycle ? theme.colors.red[8] : theme.colors.blue[8])
        .attr('stroke-width', 1.5);
      
      // Add lock icon to processes
      d3.select(this).append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('fill', 'white')
        .attr('font-size', '14px')
        .attr('font-family', 'serif')
        .text('🔒');
      
    } else if (d.type === 'table') {
      // Tables are rectangles
      d3.select(this).append('rect')
        .attr('width', 30)
        .attr('height', 30)
        .attr('x', -15)
        .attr('y', -15)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', d.inCycle ? rgba(theme.colors.red[1], 0.8) : 'url(#table-gradient)')
        .attr('stroke', d.inCycle ? theme.colors.red[6] : theme.colors.gray[6])
        .attr('stroke-width', 1.5);
      
      // Add database icon to tables
      d3.select(this).append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('fill', d.inCycle ? theme.colors.red[9] : theme.colors.gray[9])
        .attr('font-size', '14px')
        .attr('font-family', 'serif')
        .text('📊');
    }
  });
  
  // Add labels to nodes
  node.append('text')
    .attr('dx', (d: VisualizationNode) => d.type === 'process' ? 0 : 0)
    .attr('dy', (d: VisualizationNode) => d.type === 'process' ? -30 : 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', (d: VisualizationNode) => d.inCycle ? 'bold' : 'normal')
    .attr('fill', (d: VisualizationNode) => d.inCycle ? theme.colors.red[9] : theme.colors.gray[9])
    .text((d: VisualizationNode) => d.label);
  
  // Create simulation for layout
  let simulation: Simulation<SimulationNode, SimulationLink> | undefined;
  
  if (layout === 'force' && physicsEnabled) {
    // Force-directed layout with physics
    simulation = d3.forceSimulation<SimulationNode, SimulationLink>(nodesWithPosition)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>()
        .id((d: SimulationNode) => d.id.toString())
        .links(linksForSimulation as SimulationLink[])
        .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: VisualizationEdge) => getNodeById(d.source).x || 0)
        .attr('y1', (d: VisualizationEdge) => getNodeById(d.source).y || 0)
        .attr('x2', (d: VisualizationEdge) => getNodeById(d.target).x || 0)
        .attr('y2', (d: VisualizationEdge) => getNodeById(d.target).y || 0);
      
      edgeLabels
        .attr('x', (d: VisualizationEdge) => {
          const sourceNode = getNodeById(d.source);
          const targetNode = getNodeById(d.target);
          return ((sourceNode.x || 0) + (targetNode.x || 0)) / 2;
        })
        .attr('y', (d: VisualizationEdge) => {
          const sourceNode = getNodeById(d.source);
          const targetNode = getNodeById(d.target);
          return ((sourceNode.y || 0) + (targetNode.y || 0)) / 2;
        });
      
      node.attr('transform', (d: SimulationNode) => `translate(${d.x || 0},${d.y || 0})`);
    });
  } else if (layout === 'force' && !physicsEnabled) {
    // Force-directed layout without physics (manually positioned)
    initializePositions(nodesWithPosition, width, height);
    
    link
      .attr('x1', (d: VisualizationEdge) => getNodeById(d.source).x || 0)
      .attr('y1', (d: VisualizationEdge) => getNodeById(d.source).y || 0)
      .attr('x2', (d: VisualizationEdge) => getNodeById(d.target).x || 0)
      .attr('y2', (d: VisualizationEdge) => getNodeById(d.target).y || 0);
    
    edgeLabels
      .attr('x', (d: VisualizationEdge) => {
        const sourceNode = getNodeById(d.source);
        const targetNode = getNodeById(d.target);
        return ((sourceNode.x || 0) + (targetNode.x || 0)) / 2;
      })
      .attr('y', (d: VisualizationEdge) => {
        const sourceNode = getNodeById(d.source);
        const targetNode = getNodeById(d.target);
        return ((sourceNode.y || 0) + (targetNode.y || 0)) / 2;
      });
    
    node.attr('transform', (d: SimulationNode) => `translate(${d.x || 0},${d.y || 0})`);
    
  } else if (layout === 'circular') {
    // Circular layout
    // Position processes in an inner circle
    const processes = nodesWithPosition.filter(n => n.type === 'process');
    const tables = nodesWithPosition.filter(n => n.type === 'table');
    
    // Process circle
    const processRadius = Math.min(width, height) / 3;
    const processAngleStep = (2 * Math.PI) / Math.max(1, processes.length);
    
    processes.forEach((node, i) => {
      node.x = width / 2 + processRadius * Math.cos(i * processAngleStep);
      node.y = height / 2 + processRadius * Math.sin(i * processAngleStep);
    });
    
    // Table circle (outer ring)
    const tableRadius = processRadius * 1.6;
    const tableAngleStep = (2 * Math.PI) / Math.max(1, tables.length);
    
    tables.forEach((node, i) => {
      node.x = width / 2 + tableRadius * Math.cos(i * tableAngleStep);
      node.y = height / 2 + tableRadius * Math.sin(i * tableAngleStep);
    });
    
    // Update positions immediately
    link
      .attr('x1', (d: VisualizationEdge) => getNodeById(d.source).x || 0)
      .attr('y1', (d: VisualizationEdge) => getNodeById(d.source).y || 0)
      .attr('x2', (d: VisualizationEdge) => getNodeById(d.target).x || 0)
      .attr('y2', (d: VisualizationEdge) => getNodeById(d.target).y || 0);
    
    edgeLabels
      .attr('x', (d: VisualizationEdge) => {
        const sourceNode = getNodeById(d.source);
        const targetNode = getNodeById(d.target);
        return ((sourceNode.x || 0) + (targetNode.x || 0)) / 2;
      })
      .attr('y', (d: VisualizationEdge) => {
        const sourceNode = getNodeById(d.source);
        const targetNode = getNodeById(d.target);
        return ((sourceNode.y || 0) + (targetNode.y || 0)) / 2;
      });
    
    node.attr('transform', (d: SimulationNode) => `translate(${d.x || 0},${d.y || 0})`);
    
  } else if (layout === 'dagre') {
    // Hierarchical layout
    // Separate processes and tables
    const processes = nodesWithPosition.filter(n => n.type === 'process');
    const tables = nodesWithPosition.filter(n => n.type === 'table');
    
    // Position processes on top row
    const processWidth = width / (processes.length + 1);
    processes.forEach((node, i) => {
      node.x = processWidth * (i + 1);
      node.y = height / 4;
    });
    
    // Position tables on bottom row
    const tableWidth = width / (tables.length + 1);
    tables.forEach((node, i) => {
      node.x = tableWidth * (i + 1);
      node.y = (3 * height) / 4;
    });
    
    // Update positions immediately
    link
      .attr('x1', (d: VisualizationEdge) => getNodeById(d.source).x || 0)
      .attr('y1', (d: VisualizationEdge) => getNodeById(d.source).y || 0)
      .attr('x2', (d: VisualizationEdge) => getNodeById(d.target).x || 0)
      .attr('y2', (d: VisualizationEdge) => getNodeById(d.target).y || 0);
    
    edgeLabels
      .attr('x', (d: VisualizationEdge) => {
        const sourceNode = getNodeById(d.source);
        const targetNode = getNodeById(d.target);
        return ((sourceNode.x || 0) + (targetNode.x || 0)) / 2;
      })
      .attr('y', (d: VisualizationEdge) => {
        const sourceNode = getNodeById(d.source);
        const targetNode = getNodeById(d.target);
        return ((sourceNode.y || 0) + (targetNode.y || 0)) / 2;
      });
    
    node.attr('transform', (d: SimulationNode) => `translate(${d.x || 0},${d.y || 0})`);
  }
  
  // Helper function to get node by ID
  function getNodeById(id: string | number | VisualizationNode): SimulationNode {
    if (typeof id === 'object' && id !== null) {
      return id as SimulationNode;
    }
    return nodesWithPosition.find(n => n.id === id) || { id: 'unknown', type: 'unknown', label: 'unknown', x: 0, y: 0 } as SimulationNode;
  }
  
  // Helper function to initialize positions
  function initializePositions(nodes: VisualizationNode[], width: number, height: number): void {
    const processes = nodes.filter(n => n.type === 'process');
    const tables = nodes.filter(n => n.type === 'table');
    
    // Position processes in the middle
    const centerX = width / 2;
    const centerY = height / 2;
    const processSpread = Math.min(width, height) / 3;
    
    processes.forEach((node, i) => {
      const angle = (i / processes.length) * 2 * Math.PI;
      node.x = centerX + Math.cos(angle) * processSpread;
      node.y = centerY + Math.sin(angle) * processSpread;
    });
    
    // Position tables in a wider ring
    const tableSpread = processSpread * 1.5;
    tables.forEach((node, i) => {
      const angle = (i / tables.length) * 2 * Math.PI;
      node.x = centerX + Math.cos(angle) * tableSpread;
      node.y = centerY + Math.sin(angle) * tableSpread;
    });
  }
  
  // Drag functions
  function dragstarted(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
    if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  
  function dragged(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
    
    // Update positions immediately 
    if (!simulation || !simulation.alpha()) {
      event.subject.x = event.x;
      event.subject.y = event.y;
      
      // Update links
      link
        .attr('x1', (d: VisualizationEdge) => getNodeById(d.source).x || 0)
        .attr('y1', (d: VisualizationEdge) => getNodeById(d.source).y || 0)
        .attr('x2', (d: VisualizationEdge) => getNodeById(d.target).x || 0)
        .attr('y2', (d: VisualizationEdge) => getNodeById(d.target).y || 0);
      
      // Update edge labels
      edgeLabels
        .attr('x', (d: VisualizationEdge) => {
          const sourceNode = getNodeById(d.source);
          const targetNode = getNodeById(d.target);
          return ((sourceNode.x || 0) + (targetNode.x || 0)) / 2;
        })
        .attr('y', (d: VisualizationEdge) => {
          const sourceNode = getNodeById(d.source);
          const targetNode = getNodeById(d.target);
          return ((sourceNode.y || 0) + (targetNode.y || 0)) / 2;
        });
      
      // Update node positions
      node.attr('transform', (d: SimulationNode) => `translate(${d.x || 0},${d.y || 0})`);
    }
  }
  
  function dragended(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
    if (!event.active && simulation) simulation.alphaTarget(0);
    // Keep the node where the user dragged it
    event.subject.x = event.x;
    event.subject.y = event.y;
  }
  
  // Initially center and fit the visualization
  zoomToFit(svg, g, 0.95);
  
  // Store the simulation for cleanup
  svg.datum(simulation);
}

/**
 * Generate HTML for node tooltip
 */
function generateNodeTooltip(node: VisualizationNode): string {
  if (node.type === 'process') {
    return `
      <div style="font-weight: bold;">Process ${node.label.split(' ')[1]}</div>
      ${node.inCycle ? '<div style="color: #e03131; font-weight: bold;">Part of deadlock cycle</div>' : ''}
      ${node.application ? `<div style="margin-top: 5px;"><b>Application:</b> ${node.application}</div>` : ''}
      ${node.username ? `<div style="margin-top: 2px;"><b>User:</b> ${node.username}</div>` : ''}
      ${node.query ? `
        <div style="margin-top: 8px; font-weight: bold;">Query:</div>
        <div style="font-family: monospace; font-size: 11px; margin-top: 3px; max-width: 280px; overflow-wrap: break-word; border-left: 2px solid #dee2e6; padding-left: 8px;">${node.query}</div>
      ` : ''}
      ${node.locks_held && node.locks_held.length ? 
        `<div style="margin-top: 8px; font-weight: bold;">Locks Held:</div>
         <ul style="margin: 3px 0; padding-left: 20px; font-size: 11px;">
           ${node.locks_held.map(lock => `<li>${lock}</li>`).join('')}
         </ul>` : ''
      }
      ${node.locks_waiting && node.locks_waiting.length ? 
        `<div style="margin-top: 5px; font-weight: bold;">Waiting For:</div>
         <ul style="margin: 3px 0; padding-left: 20px; font-size: 11px;">
           ${node.locks_waiting.map(lock => `<li>${lock}</li>`).join('')}
         </ul>` : ''
      }
      ${node.tables && node.tables.length ? 
        `<div style="margin-top: 5px; font-weight: bold;">Tables Accessed:</div>
         <ul style="margin: 3px 0; padding-left: 20px; font-size: 11px;">
           ${node.tables.map(table => `<li>${table}</li>`).join('')}
         </ul>` : ''
      }
      ${node.queryFingerprint ? 
        `<div style="margin-top: 5px; font-size: 10px; color: #868e96;">Query fingerprint: ${node.queryFingerprint}</div>` : ''
      }
    `;
  } else if (node.type === 'table') {
    return `
      <div style="font-weight: bold;">Table: ${node.label}</div>
      ${node.inCycle ? '<div style="color: #e03131; font-weight: bold;">Involved in deadlock cycle</div>' : ''}
    `;
  }
  
  return `<div>${node.label}</div>`;
}

/**
 * Generate HTML for edge tooltip
 */
function generateEdgeTooltip(edge: VisualizationEdge): string {
  if (edge.label === 'waits for') {
    return `
      <div style="font-weight: bold;">${edge.label}</div>
      ${edge.inCycle ? '<div style="color: #e03131; font-weight: bold;">Part of deadlock cycle</div>' : ''}
      ${edge.details ? `
        <div style="margin-top: 5px; font-size: 12px;">${edge.details}</div>
      ` : ''}
    `;
  } else if (edge.label === 'accesses') {
    return `
      <div style="font-weight: bold;">Table Access</div>
      <div style="margin-top: 3px; font-size: 12px;">This process accesses the table</div>
    `;
  }
  
  return `<div>${edge.label || 'Connection'}</div>`;
}

/**
 * Zoom to fit all content within view
 */
function zoomToFit(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, g: d3.Selection<SVGGElement, unknown, null, undefined>, paddingPercent = 0.95) {
  const bounds = (g.node() as SVGGraphicsElement | null)?.getBBox();
  if (!bounds) return;
  
  const parent = svg.node()?.parentElement;
  if (!parent) return;
  
  const fullWidth = parent.clientWidth;
  const fullHeight = parent.clientHeight;
  
  const width = bounds.width;
  const height = bounds.height;
  
  const midX = bounds.x + width / 2;
  const midY = bounds.y + height / 2;
  
  if (width === 0 || height === 0) return; // Nothing to fit
  
  const scale = paddingPercent / Math.max(width / fullWidth, height / fullHeight);
  const translate: [number, number] = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
  
  const transform = d3.zoomIdentity
    .translate(translate[0], translate[1])
    .scale(scale);
  
  svg.transition()
    .duration(500)
    .call(d3.zoom<SVGSVGElement, unknown>().transform, transform);
}

export default EnhancedGraphView;
