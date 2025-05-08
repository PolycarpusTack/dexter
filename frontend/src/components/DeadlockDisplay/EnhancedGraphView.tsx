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
  ThemeIcon
} from '@mantine/core';
import * as d3 from 'd3';
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

// Custom node type for D3 visualization
interface VisualizationNode {
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
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

// Custom edge type for D3 visualization
interface VisualizationEdge {
  source: string | number;
  target: string | number;
  label?: string;
  inCycle?: boolean;
  details?: string;
}

// Visualization data structure
interface GraphData {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  cycles?: string[][];
  severity?: number;
  tables?: Record<string, {
    accessPattern?: string;
  }>;
}

interface EnhancedGraphViewProps {
  data?: GraphData | DeadlockVisualizationData | any; // Allow any temporarily for backward compatibility
  isLoading: boolean;
}

interface VisualizationOptions {
  layout: string;
  physicsEnabled: boolean;
  chargeStrength: number;
  theme: any;
  rgba: (color: string, alpha?: number) => string;
}

/**
 * Helper function to convert color to rgba
 * This replaces theme.fn.rgba which isn't available in our Mantine version
 */
function rgba(color: string, alpha = 1): string {
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
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // Default fallback
  return `rgba(128, 128, 128, ${alpha})`;
}

/**
 * Enhanced interactive graph visualization of PostgreSQL deadlock with advanced features
 */
const EnhancedGraphView: React.FC<EnhancedGraphViewProps> = ({ data, isLoading }) => {
  const theme = useMantineTheme();
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
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
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
        const simulation = d3.select(svgRef.current).datum();
        if (simulation) {
          simulation.stop();
        }
      }
    };
  }, [data, isLoading, layout, theme, showCyclesOnly, showTables, physicsEnabled, chargeStrength]);
  
  // Handle layout changes
  const handleLayoutChange = (value: string) => {
    setLayout(value);
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
  };
  
  // Export SVG
  const handleExportSVG = () => {
    try {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      
      // Make a copy of the SVG
      const svgCopy = svgRef.current.cloneNode(true) as SVGSVGElement;
      
      // Clean up transform on root group element
      const g = svgCopy.querySelector('g');
      if (g) {
        g.removeAttribute('transform');
      }
      
      // Set attributes needed for standalone SVG
      svgCopy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgCopy.setAttribute('width', svgRef.current.clientWidth.toString());
      svgCopy.setAttribute('height', svgRef.current.clientHeight.toString());
      
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
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        height: fullscreen ? 'calc(100vh - 150px)' : '550px',
        transition: 'height 0.3s ease',
        position: 'relative',
        backgroundColor: theme.colors.gray[0]
      })}
    >
      {/* Header with controls */}
      <Group position="apart" mb="md">
        <Group spacing="xs">
          <Text fw={600}>Deadlock Graph</Text>
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
                <Text size="sm" weight={500} mb={5}>Deadlock Severity: {severityScore}/100</Text>
                <Text size="xs">
                  Based on factors like the number of transactions, tables involved, 
                  lock types, and the complexity of the deadlock cycle.
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>
          )}
        </Group>
        
        <Group spacing="xs">
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
            sx={{ width: '120px' }}
          />
          
          {/* Zoom controls */}
          <ActionIcon 
            variant="light"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <IconZoomIn size={16} />
          </ActionIcon>
          
          <ActionIcon 
            variant="light"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <IconZoomOut size={16} />
          </ActionIcon>
          
          <ActionIcon 
            variant="light"
            onClick={handleReset}
            title="Reset view"
            aria-label="Reset view"
          >
            <IconReload size={16} />
          </ActionIcon>
          
          {/* Export SVG */}
          <ActionIcon
            variant="light"
            onClick={handleExportSVG}
            title="Export as SVG"
            aria-label="Export as SVG"
          >
            <IconChartBar size={16} />
          </ActionIcon>
          
          {/* Fullscreen toggle */}
          <ActionIcon 
            variant="light"
            onClick={handleFullscreenToggle}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />}
          </ActionIcon>
        </Group>
      </Group>
      
      {/* Configuration options */}
      <Group position="apart" mb="md" spacing="xl">
        <Group spacing="md">
          {/* Show only cycles checkbox */}
          <Checkbox
            label="Show deadlock cycle only"
            checked={showCyclesOnly}
            onChange={(event) => setShowCyclesOnly(event.currentTarget.checked)}
            size="xs"
          />
          
          {/* Show tables checkbox */}
          <Checkbox
            label="Show tables"
            checked={showTables}
            onChange={(event) => setShowTables(event.currentTarget.checked)}
            size="xs"
          />
        </Group>
        
        <Group spacing="md">
          {/* Physics toggle */}
          <Switch
            label="Physics simulation"
            checked={physicsEnabled}
            onChange={(event) => setPhysicsEnabled(event.currentTarget.checked)}
            size="xs"
          />
          
          {/* Force strength slider (only show when physics is enabled) */}
          {physicsEnabled && (
            <Box sx={{ width: 120 }}>
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
        sx={{ 
          flex: 1, 
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: theme.white,
          borderRadius: theme.radius.sm
        }}
      >
        {isLoading ? (
          <Box 
            sx={{ 
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
            sx={{ 
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
              sx={{
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
              
              <Group spacing="xs" mb={5}>
                <Box
                  sx={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.blue[6]
                  }}
                />
                <Text size="xs">Process</Text>
              </Group>
              
              <Group spacing="xs" mb={5}>
                <Box
                  sx={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.red[6]
                  }}
                />
                <Text size="xs">Process in Deadlock</Text>
              </Group>
              
              <Group spacing="xs" mb={5}>
                <Box
                  sx={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '4px',
                    backgroundColor: theme.colors.gray[5]
                  }}
                />
                <Text size="xs">Table</Text>
              </Group>
              
              <Group spacing="xs" mb={5}>
                <Box
                  sx={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: theme.colors.red[6]
                  }}
                />
                <Text size="xs">Deadlock Relation</Text>
              </Group>
              
              <Group spacing="xs">
                <Box
                  sx={{
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
        <Group position="apart" mt="xs">
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
  data: any, 
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
  const nodesWithPosition = nodes.map((node: VisualizationNode) => ({
    ...node,
    x: undefined,
    y: undefined
  }));
  
  // Map nodes and edges for the simulation
  const linksForSimulation = edges.map((edge: VisualizationEdge) => ({
    ...edge,
    source: edge.source,
    target: edge.target
  }));
  
  // Create links (edges)
  const link = g.append('g')
    .selectAll('line')
    .data(edges)
    .enter()
    .append('line')
    .attr('stroke', (d: VisualizationEdge) => d.inCycle ? theme.colors.red[6] : theme.colors.gray[5])
    .attr('stroke-width', (d: VisualizationEdge) => d.inCycle ? 2 : 1)
    .attr('stroke-dasharray', (d: VisualizationEdge) => d.label === 'accesses' ? '3,3' : null)
    .attr('marker-end', (d: VisualizationEdge) => d.inCycle ? 'url(#arrowhead-cycle)' : 'url(#arrowhead)')
    .attr('opacity', 0.7)
    .on('mouseover', function(event: MouseEvent, d: VisualizationEdge) {
      // Show tooltip
      tooltip.style('display', 'block')
        .html(generateEdgeTooltip(d))
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px');
        
      // Highlight this edge
      d3.select(this)
        .attr('stroke-width', d.inCycle ? 3 : 2)
        .attr('opacity', 1)
        .attr('filter', 'url(#highlight-shadow)');
    })
    .on('mouseout', function() {
      // Hide tooltip
      tooltip.style('display', 'none');
      
      // Reset edge style
      d3.select(this)
        .attr('stroke-width', (d: VisualizationEdge) => d.inCycle ? 2 : 1)
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
    .selectAll('g')
    .data(nodesWithPosition)
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(d3.drag<SVGGElement, VisualizationNode>()
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
      link.each(function(l: VisualizationEdge) {
        if (l.source === d.id || l.target === d.id) {
          d3.select(this)
            .attr('stroke-width', l.inCycle ? 3 : 2)
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
  let simulation: d3.Simulation<VisualizationNode, undefined> | undefined;
  
  if (layout === 'force' && physicsEnabled) {
    // Force-directed layout with physics
    simulation = d3.forceSimulation<VisualizationNode>(nodesWithPosition)
      .force('link', d3.forceLink<VisualizationNode, d3.SimulationLinkDatum<VisualizationNode>>()
        .id((d: VisualizationNode) => d.id)
        .links(linksForSimulation)
        .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => getNodeById(d.source).x || 0)
        .attr('y1', (d: any) => getNodeById(d.source).y || 0)
        .attr('x2', (d: any) => getNodeById(d.target).x || 0)
        .attr('y2', (d: any) => getNodeById(d.target).y || 0);
      
      edgeLabels
        .attr('x', (d: any) => (getNodeById(d.source).x + getNodeById(d.target).x) / 2 || 0)
        .attr('y', (d: any) => (getNodeById(d.source).y + getNodeById(d.target).y) / 2 || 0);
      
      node.attr('transform', (d: VisualizationNode) => `translate(${d.x || 0},${d.y || 0})`);
    });
  } else if (layout === 'force' && !physicsEnabled) {
    // Force-directed layout without physics (manually positioned)
    initializePositions(nodesWithPosition, width, height);
    
    link
      .attr('x1', (d: any) => getNodeById(d.source).x || 0)
      .attr('y1', (d: any) => getNodeById(d.source).y || 0)
      .attr('x2', (d: any) => getNodeById(d.target).x || 0)
      .attr('y2', (d: any) => getNodeById(d.target).y || 0);
    
    edgeLabels
      .attr('x', (d: any) => (getNodeById(d.source).x + getNodeById(d.target).x) / 2 || 0)
      .attr('y', (d: any) => (getNodeById(d.source).y + getNodeById(d.target).y) / 2 || 0);
    
    node.attr('transform', (d: VisualizationNode) => `translate(${d.x || 0},${d.y || 0})`);
    
  } else if (layout === 'circular') {
    // Circular layout
    // Position processes in an inner circle
    const processes = nodesWithPosition.filter(n => n.type === 'process');
    const tables = nodesWithPosition.filter(n => n.type === 'table');
    
    // Process circle
    const processRadius = Math.min(width, height) / 3;
    const processAngleStep = (2 * Math.PI) / processes.length;
    
    processes.forEach((node, i) => {
      node.x = width / 2 + processRadius * Math.cos(i * processAngleStep);
      node.y = height / 2 + processRadius * Math.sin(i * processAngleStep);
    });
    
    // Table circle (outer ring)
    const tableRadius = processRadius * 1.6;
    const tableAngleStep = (2 * Math.PI) / tables.length;
    
    tables.forEach((node, i) => {
      node.x = width / 2 + tableRadius * Math.cos(i * tableAngleStep);
      node.y = height / 2 + tableRadius * Math.sin(i * tableAngleStep);
    });
    
    // Update positions immediately
    link
      .attr('x1', (d: any) => getNodeById(d.source).x || 0)
      .attr('y1', (d: any) => getNodeById(d.source).y || 0)
      .attr('x2', (d: any) => getNodeById(d.target).x || 0)
      .attr('y2', (d: any) => getNodeById(d.target).y || 0);
    
    edgeLabels
      .attr('x', (d: any) => (getNodeById(d.source).x + getNodeById(d.target).x) / 2 || 0)
      .attr('y', (d: any) => (getNodeById(d.source).y + getNodeById(d.target).y) / 2 || 0);
    
    node.attr('transform', (d: VisualizationNode) => `translate(${d.x || 0},${d.y || 0})`);
    
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
      .attr('x1', (d: any) => getNodeById(d.source).x || 0)
      .attr('y1', (d: any) => getNodeById(d.source).y || 0)
      .attr('x2', (d: any) => getNodeById(d.target).x || 0)
      .attr('y2', (d: any) => getNodeById(d.target).y || 0);
    
    edgeLabels
      .attr('x', (d: any) => (getNodeById(d.source).x + getNodeById(d.target).x) / 2 || 0)
      .attr('y', (d: any) => (getNodeById(d.source).y + getNodeById(d.target).y) / 2 || 0);
    
    node.attr('transform', (d: VisualizationNode) => `translate(${d.x || 0},${d.y || 0})`);
  }
  
  // Helper function to get node by ID
  function getNodeById(id: string | number): VisualizationNode {
    return nodesWithPosition.find(n => n.id === id) || { id: 'unknown', type: 'unknown', label: 'unknown', x: 0, y: 0 };
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
  function dragstarted(event: d3.D3DragEvent<SVGGElement, VisualizationNode, VisualizationNode>) {
    if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  
  function dragged(event: d3.D3DragEvent<SVGGElement, VisualizationNode, VisualizationNode>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
    
    // Update positions immediately 
    if (!simulation || !simulation.alpha()) {
      event.subject.x = event.x;
      event.subject.y = event.y;
      
      // Update links
      link
        .attr('x1', (d: any) => getNodeById(d.source).x || 0)
        .attr('y1', (d: any) => getNodeById(d.source).y || 0)
        .attr('x2', (d: any) => getNodeById(d.target).x || 0)
        .attr('y2', (d: any) => getNodeById(d.target).y || 0);
      
      // Update edge labels
      edgeLabels
        .attr('x', (d: any) => (getNodeById(d.source).x + getNodeById(d.target).x) / 2 || 0)
        .attr('y', (d: any) => (getNodeById(d.source).y + getNodeById(d.target).y) / 2 || 0);
      
      // Update node positions
      node.attr('transform', (d: VisualizationNode) => `translate(${d.x || 0},${d.y || 0})`);
    }
  }
  
  function dragended(event: d3.D3DragEvent<SVGGElement, VisualizationNode, VisualizationNode>) {
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
  const bounds = g.node()?.getBBox();
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
  const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
  
  const transform = d3.zoomIdentity
    .translate(translate[0], translate[1])
    .scale(scale);
  
  svg.transition()
    .duration(500)
    .call(d3.zoom<SVGSVGElement, unknown>().transform, transform);
}

export default EnhancedGraphView;
