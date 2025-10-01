// File: frontend/src/components/N1QueryModal/N1QueryWaterfallVisualization.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Paper, Group, ActionIcon, Tooltip, Badge, Select, Box } from '@mantine/core';
import { IconZoomIn, IconZoomOut, IconZoomReset, IconDownload } from '@tabler/icons-react';
import * as d3 from 'd3';
import type { VisualizationData } from '../../types/analyzers';

interface N1QueryWaterfallVisualizationProps {
  data: VisualizationData;
}

interface QueryNode {
  id: string;
  label: string;
  type: string;
  sql?: string;
  table?: string;
  query_type?: string;
  execution_time?: number;
  execution_count?: number;
  is_parent?: boolean;
  is_child?: boolean;
  depth?: number;
  startTime?: number;
  endTime?: number;
}

export const N1QueryWaterfallVisualization: React.FC<N1QueryWaterfallVisualizationProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedPattern, setSelectedPattern] = useState<string>('all');

  const nodes = data.data?.nodes || [];
  const patterns = data.data?.patterns || [];

  // Calculate waterfall layout
  const calculateWaterfallLayout = (nodes: QueryNode[]): QueryNode[] => {
    let currentTime = 0;
    const layoutNodes: QueryNode[] = [];

    // First, process parent queries
    const parentNodes = nodes.filter(n => n.is_parent);
    const childNodes = nodes.filter(n => n.is_child);

    parentNodes.forEach((parent, index) => {
      const parentNode = {
        ...parent,
        depth: 0,
        startTime: currentTime,
        endTime: currentTime + (parent.execution_time || 0)
      };
      layoutNodes.push(parentNode);
      currentTime = parentNode.endTime || 0;

      // Add child queries for this parent
      const patternChildren = childNodes.filter(child => 
        child.table === parent.table || child.label?.includes(parent.table || '')
      );

      patternChildren.forEach((child, childIndex) => {
        const childNode = {
          ...child,
          depth: 1,
          startTime: currentTime,
          endTime: currentTime + (child.execution_time || 0)
        };
        layoutNodes.push(childNode);
        currentTime = childNode.endTime || 0;
      });

      // Add some spacing between patterns
      currentTime += 10;
    });

    return layoutNodes;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const margin = { top: 40, right: 40, bottom: 60, left: 200 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate layout
    const layoutNodes = calculateWaterfallLayout(nodes);
    const maxTime = d3.max(layoutNodes, d => d.endTime || 0) || 100;

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, maxTime])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(layoutNodes.map(d => d.id))
      .range([0, height])
      .padding(0.1);

    const colorScale = d3.scaleOrdinal()
      .domain(['parent', 'child'])
      .range(['#4C6EF5', '#FA5252']);

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    // X-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `${d}ms`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .text('Execution Time (ms)');

    // Draw waterfall bars
    const bars = g.selectAll('.query-bar')
      .data(layoutNodes)
      .enter()
      .append('g')
      .attr('class', 'query-bar');

    // Background bars (total time)
    bars.append('rect')
      .attr('x', d => xScale(d.startTime || 0))
      .attr('y', d => yScale(d.id) || 0)
      .attr('width', d => xScale((d.endTime || 0) - (d.startTime || 0)))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => d.is_parent ? '#4C6EF5' : '#FA5252')
      .attr('opacity', 0.7)
      .attr('rx', 4);

    // Query labels
    bars.append('text')
      .attr('x', -10)
      .attr('y', d => (yScale(d.id) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .text(d => {
        const label = d.label || d.id;
        return label.length > 25 ? label.substring(0, 25) + '...' : label;
      });

    // Execution count badges
    bars.filter(d => (d.execution_count || 0) > 1)
      .append('text')
      .attr('x', d => xScale(d.endTime || 0) + 5)
      .attr('y', d => (yScale(d.id) || 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#FA5252')
      .text(d => `×${d.execution_count}`);

    // Tooltips
    const tooltip = d3.select('body').append('div')
      .attr('class', 'query-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('max-width', '400px')
      .style('z-index', '1000');

    bars.on('mouseover', (event, d) => {
      tooltip.style('visibility', 'visible')
        .html(`
          <div>
            <strong>${d.label}</strong><br/>
            Table: ${d.table || 'N/A'}<br/>
            Type: ${d.is_parent ? 'Parent Query' : 'Child Query'}<br/>
            Execution Time: ${d.execution_time}ms<br/>
            Execution Count: ${d.execution_count || 1}<br/>
            ${d.sql ? `<br/><code style="font-family: monospace; font-size: 11px;">${d.sql.substring(0, 200)}${d.sql.length > 200 ? '...' : ''}</code>` : ''}
          </div>
        `);
    })
    .on('mousemove', (event) => {
      tooltip
        .style('top', `${event.pageY - 10}px`)
        .style('left', `${event.pageX + 10}px`);
    })
    .on('mouseout', () => {
      tooltip.style('visibility', 'hidden');
    });

    // Cleanup
    return () => {
      d3.select('body').selectAll('.query-tooltip').remove();
    };
  }, [data, nodes, selectedPattern]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.2
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.8
    );
  };

  const handleZoomReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
    setZoom(1);
  };

  const handleExport = () => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'n1-query-waterfall.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Group position="apart" mb="md">
        <Group>
          <Badge color="blue" variant="light">
            Parent Queries: {nodes.filter(n => n.is_parent).length}
          </Badge>
          <Badge color="red" variant="light">
            Child Queries: {nodes.filter(n => n.is_child).length}
          </Badge>
          <Badge color="orange" variant="light">
            Total Patterns: {patterns.length}
          </Badge>
        </Group>
        
        <Group>
          <Tooltip label="Zoom In">
            <ActionIcon onClick={handleZoomIn} variant="light">
              <IconZoomIn size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Zoom Out">
            <ActionIcon onClick={handleZoomOut} variant="light">
              <IconZoomOut size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset Zoom">
            <ActionIcon onClick={handleZoomReset} variant="light">
              <IconZoomReset size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export SVG">
            <ActionIcon onClick={handleExport} variant="light">
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Paper 
        ref={containerRef}
        withBorder 
        p={0} 
        style={{ 
          width: '100%', 
          height: 400, 
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </Paper>

      <Group mt="md">
        <Badge color="gray" size="sm">
          Zoom: {(zoom * 100).toFixed(0)}%
        </Badge>
      </Group>
    </Box>
  );
};