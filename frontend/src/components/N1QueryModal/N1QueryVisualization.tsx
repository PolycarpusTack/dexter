import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Text, Center, Loader } from '@mantine/core';

interface N1QueryVisualizationProps {
  data: {
    nodes: any[];
    edges: any[];
    patterns: any[];
  };
  svgRef?: React.RefObject<SVGSVGElement>;
}

const N1QueryVisualization: React.FC<N1QueryVisualizationProps> = ({ data, svgRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const localSvgRef = useRef<SVGSVGElement>(null);
  
  // Use provided svgRef or local one
  const effectiveSvgRef = svgRef || localSvgRef;
  
  useEffect(() => {
    if (!data || !containerRef.current) return;
    
    // Clear previous visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Create new SVG
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('ref', effectiveSvgRef)
      .attr('viewBox', [0, 0, width, height]);
      
    if (effectiveSvgRef.current) {
      effectiveSvgRef.current = svg.node() as SVGSVGElement;
    }
    
    // Add zoom behavior
    const g = svg.append('g');
    
    svg.call(
      // @ts-ignore - d3 typing issue
      d3.zoom().on('zoom', (event) => {
        g.attr('transform', event.transform);
      })
    );
    
    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges)
        .id((d: any) => d.id)
        .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));
    
    // Define marker for arrowheads
    svg.append('defs').selectAll('marker')
      .data(['end'])
      .enter()
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('markerUnits', 'strokeWidth')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');
    
    // Draw edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(data.edges)
      .enter()
      .append('path')
      .attr('stroke-width', (d: any) => d.weight ? Math.min(3, 1 + Math.log(d.weight)) : 1)
      .attr('stroke', (d: any) => {
        // Check if this edge is part of a pattern
        if (d.source && d.target) {
          const sourceName = typeof d.source === 'object' ? d.source.id : d.source;
          const targetName = typeof d.target === 'object' ? d.target.id : d.target;
          
          const isInPattern = data.patterns.some(pattern => {
            if (pattern.parent_query === sourceName && pattern.child_queries.includes(targetName)) {
              return true;
            }
            return false;
          });
          
          return isInPattern ? '#ff6b6b' : '#aaa';
        }
        return '#aaa';
      })
      .attr('stroke-dasharray', (d: any) => d.label === 'accesses' ? '3,3' : 'none')
      .attr('marker-end', 'url(#arrowhead)');
    
    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(
        // @ts-ignore - d3 typing issue
        d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );
    
    // Add node shapes
    node.append('circle')
      .attr('r', (d: any) => d.type === 'query' ? 25 : 20)
      .attr('fill', (d: any) => {
        if (d.type === 'table') return '#4dabf7';
        if (d.is_parent) return '#ffa94d';
        if (d.is_child) return '#ff6b6b';
        return '#74c0fc';
      })
      .attr('stroke', (d: any) => {
        if (d.type === 'table') return '#339af0';
        if (d.is_parent) return '#f76707';
        if (d.is_child) return '#fa5252';
        return '#4dabf7';
      })
      .attr('stroke-width', 2);
    
    // Add node text labels
    node.append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .text((d: any) => d.label.length > 15 ? d.label.substring(0, 12) + '...' : d.label)
      .attr('font-size', 12)
      .attr('pointer-events', 'none');
    
    // Add tooltips
    node.append('title')
      .text((d: any) => {
        if (d.type === 'table') {
          return `Table: ${d.label}`;
        } else if (d.type === 'query') {
          return `${d.query_type} query on ${d.table}
Execution time: ${d.execution_time}ms
Executed ${d.execution_count} time(s)
SQL: ${d.sql || 'N/A'}`;
        }
        return d.label;
      });
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      // Keep nodes within bounds
      node.attr('transform', (d: any) => {
        d.x = Math.max(30, Math.min(width - 30, d.x));
        d.y = Math.max(30, Math.min(height - 30, d.y));
        return `translate(${d.x},${d.y})`;
      });
      
      // Update curved edges
      link.attr('d', (d: any) => {
        const source = d.source;
        const target = d.target;
        
        // Get positions
        const sourceX = typeof source === 'object' ? source.x : 0;
        const sourceY = typeof source === 'object' ? source.y : 0;
        const targetX = typeof target === 'object' ? target.x : 0;
        const targetY = typeof target === 'object' ? target.y : 0;
        
        // Calculate midpoint
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2 - 20; // Curve upward
        
        return `M${sourceX},${sourceY} Q${midX},${midY} ${targetX},${targetY}`;
      });
    });
    
    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Return cleanup function
    return () => {
      simulation.stop();
    };
  }, [data]);
  
  if (!data || !data.nodes || !data.edges) {
    return (
      <Center style={{ height: '100%' }}>
        <Loader />
      </Center>
    );
  }
  
  if (data.nodes.length === 0) {
    return (
      <Center style={{ height: '100%' }}>
        <Text>No data available for visualization</Text>
      </Center>
    );
  }
  
  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default N1QueryVisualization;