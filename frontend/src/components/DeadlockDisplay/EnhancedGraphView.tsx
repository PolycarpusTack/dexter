import React, { useEffect, useRef } from 'react';
import { 
  Paper, 
  Text, 
  Loader, 
  useMantineTheme, 
  Group,
  Badge
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import * as d3 from 'd3';

// Define interfaces for props
interface EnhancedGraphViewProps {
  data?: any; // Allow any temporarily for backward compatibility
  isLoading: boolean;
}

/**
 * Enhanced interactive graph visualization of PostgreSQL deadlock with advanced features
 * This is a simplified implementation - full implementation would include complex D3 code
 */
const EnhancedGraphView: React.FC<EnhancedGraphViewProps> = ({ data, isLoading }) => {
  const theme = useMantineTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Use D3 to create visualization when data changes
  useEffect(() => {
    if (isLoading || !data || !svgRef.current) {
      return;
    }
    
    // Get reference to svg using d3
    const svg = d3.select(svgRef.current);
    
    // Clear previous visualization
    svg.selectAll('*').remove();
    
    // Set up the visualization
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
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
    
    // Get nodes and edges from data
    const nodes = data.processes || [];
    const edges = [];
    
    // Process data to create edges between nodes
    nodes.forEach(process => {
      if (process.blockingPids) {
        process.blockingPids.forEach(blockingPid => {
          edges.push({
            source: process.pid,
            target: blockingPid,
            inCycle: process.inCycle
          });
        });
      }
    });
    
    // Draw the nodes (processes)
    const nodeElements = g.selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 20)
      .attr('cx', (d, i) => (width / 2) + 100 * Math.cos(i * (2 * Math.PI / nodes.length)))
      .attr('cy', (d, i) => (height / 2) + 100 * Math.sin(i * (2 * Math.PI / nodes.length)))
      .attr('fill', d => d.inCycle ? theme.colors.red[6] : theme.colors.blue[6])
      .attr('stroke', d => d.inCycle ? theme.colors.red[8] : theme.colors.blue[8])
      .attr('stroke-width', 2);
    
    // Add text labels to nodes
    g.selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('x', (d, i) => (width / 2) + 100 * Math.cos(i * (2 * Math.PI / nodes.length)))
      .attr('y', (d, i) => (height / 2) + 100 * Math.sin(i * (2 * Math.PI / nodes.length)) - 30)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.colors.dark[8])
      .text(d => `Process ${d.pid}`);
    
    // Draw the edges (relationships)
    const edgeElements = g.selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('x1', d => {
        const source = nodes.find(n => n.pid === d.source);
        if (!source) return 0;
        const idx = nodes.indexOf(source);
        return (width / 2) + 100 * Math.cos(idx * (2 * Math.PI / nodes.length));
      })
      .attr('y1', d => {
        const source = nodes.find(n => n.pid === d.source);
        if (!source) return 0;
        const idx = nodes.indexOf(source);
        return (height / 2) + 100 * Math.sin(idx * (2 * Math.PI / nodes.length));
      })
      .attr('x2', d => {
        const target = nodes.find(n => n.pid === d.target);
        if (!target) return 0;
        const idx = nodes.indexOf(target);
        return (width / 2) + 100 * Math.cos(idx * (2 * Math.PI / nodes.length));
      })
      .attr('y2', d => {
        const target = nodes.find(n => n.pid === d.target);
        if (!target) return 0;
        const idx = nodes.indexOf(target);
        return (height / 2) + 100 * Math.sin(idx * (2 * Math.PI / nodes.length));
      })
      .attr('stroke', d => d.inCycle ? theme.colors.red[6] : theme.colors.gray[6])
      .attr('stroke-width', d => d.inCycle ? 2 : 1)
      .attr('marker-end', d => d.inCycle ? 'url(#arrowhead-cycle)' : 'url(#arrowhead)');
    
    // Add arrowhead markers
    const defs = svg.append('defs');
    
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', theme.colors.gray[6]);
    
    defs.append('marker')
      .attr('id', 'arrowhead-cycle')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', theme.colors.red[6]);
    
    // Center the visualization
    const initialScale = 0.9;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale)
      .translate(-width / 2, -height / 2));
    
  }, [data, isLoading, theme]);
  
  // Loading state
  if (isLoading) {
    return (
      <Paper p="md" withBorder style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </Paper>
    );
  }
  
  // No data state
  if (!data || !data.processes || data.processes.length === 0) {
    return (
      <Paper p="md" withBorder style={{ height: '500px' }}>
        <Group spacing="xs" mb="md">
          <IconAlertCircle size={18} />
          <Text>No visualization data available</Text>
        </Group>
        <Text size="sm" color="dimmed">
          The server was unable to provide visualization data for this deadlock.
          This could be due to limited information in the original error message or
          an unsupported deadlock pattern.
        </Text>
      </Paper>
    );
  }
  
  return (
    <Paper p="md" withBorder>
      <Group spacing="xs" mb="md">
        <Text fw={600}>Deadlock Graph Visualization</Text>
        {data.processes?.filter(p => p.inCycle).length > 0 && (
          <Badge color="red">{data.processes.filter(p => p.inCycle).length} processes in cycle</Badge>
        )}
      </Group>
      
      <div className="deadlock-graph" style={{ height: '500px', position: 'relative' }}>
        <svg 
          ref={svgRef} 
          width="100%" 
          height="100%"
          style={{ display: 'block' }}
        />
        
        {/* Legend */}
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '8px',
          borderRadius: '4px',
          border: `1px solid ${theme.colors.gray[3]}`,
          fontSize: '12px'
        }}>
          <Text size="xs" fw={600} mb={5}>Legend</Text>
          
          <Group spacing="xs" mb={5}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: theme.colors.blue[6]
            }}></div>
            <Text size="xs">Process</Text>
          </Group>
          
          <Group spacing="xs" mb={5}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: theme.colors.red[6]
            }}></div>
            <Text size="xs">Process in Deadlock</Text>
          </Group>
          
          <Group spacing="xs" mb={5}>
            <div style={{
              width: '20px',
              height: '2px',
              backgroundColor: theme.colors.red[6]
            }}></div>
            <Text size="xs">Deadlock Relation</Text>
          </Group>
          
          <Group spacing="xs">
            <div style={{
              width: '20px',
              height: '2px',
              backgroundColor: theme.colors.gray[6]
            }}></div>
            <Text size="xs">Waiting Relation</Text>
          </Group>
        </div>
      </div>
      
      <Text size="xs" color="dimmed" mt="xs" align="right">
        Tip: Drag to pan, scroll to zoom
      </Text>
    </Paper>
  );
};

export default React.memo(EnhancedGraphView);
