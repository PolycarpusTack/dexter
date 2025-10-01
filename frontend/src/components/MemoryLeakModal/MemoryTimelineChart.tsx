import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Text, LoadingOverlay } from '@mantine/core';

interface MemoryTimelineData {
  graphs: Array<{
    type: string;
    data: any;
  }>;
}

interface MemoryTimelineChartProps {
  data?: MemoryTimelineData;
  height?: number;
}

export const MemoryTimelineChart: React.FC<MemoryTimelineChartProps> = ({
  data,
  height = 400
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Find timeline data
    const timelineGraph = data.graphs.find(g => g.type === 'timeline');
    if (!timelineGraph?.data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse data
    const metrics = timelineGraph.data.metrics || [];
    const leaks = timelineGraph.data.leaks || [];

    if (metrics.length === 0) {
      g.append('text')
        .attr('x', width / 2)
        .attr('y', chartHeight / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#666')
        .text('No timeline data available');
      return;
    }

    // Prepare data
    const timeData = metrics.map((m: any) => ({
      timestamp: new Date(m.timestamp),
      heapUsed: m.heap_used || 0,
      heapSize: m.heap_size || 0,
      gcCount: m.gc_count || 0
    }));

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(timeData, d => d.timestamp) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(timeData, d => d.heapSize) || 100])
      .range([chartHeight, 0]);

    // Line generators
    const heapUsedLine = d3.line<any>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.heapUsed))
      .curve(d3.curveMonotoneX);

    const heapSizeLine = d3.line<any>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.heapSize))
      .curve(d3.curveMonotoneX);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')));

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => d3.format('.1s')(d) + 'B'));

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

    // Add area under heap used
    const area = d3.area<any>()
      .x(d => xScale(d.timestamp))
      .y0(chartHeight)
      .y1(d => yScale(d.heapUsed))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(timeData)
      .attr('fill', 'rgba(59, 130, 246, 0.1)')
      .attr('d', area);

    // Add heap size line
    g.append('path')
      .datum(timeData)
      .attr('fill', 'none')
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', heapSizeLine);

    // Add heap used line
    g.append('path')
      .datum(timeData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', heapUsedLine);

    // Add leak markers
    leaks.forEach((leak: any) => {
      const leakTime = new Date(leak.timestamp);
      const x = xScale(leakTime);
      
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3');

      g.append('circle')
        .attr('cx', x)
        .attr('cy', 10)
        .attr('r', 4)
        .attr('fill', '#ef4444');

      // Add tooltip
      g.append('text')
        .attr('x', x)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#ef4444')
        .text(leak.type?.replace('_', ' ') || 'Leak');
    });

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 15)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 4)
      .style('font-size', '12px')
      .text('Heap Used');

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 15)
      .attr('y1', 15)
      .attr('y2', 15)
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    legend.append('text')
      .attr('x', 20)
      .attr('y', 19)
      .style('font-size', '12px')
      .text('Heap Size');

    legend.append('circle')
      .attr('cx', 7)
      .attr('cy', 30)
      .attr('r', 3)
      .attr('fill', '#ef4444');

    legend.append('text')
      .attr('x', 20)
      .attr('y', 34)
      .style('font-size', '12px')
      .text('Memory Leak');

    // Add labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (chartHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#666')
      .text('Memory Usage');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${chartHeight + margin.bottom})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#666')
      .text('Time');

  }, [data, height]);

  if (!data) {
    return (
      <Box style={{ height, position: 'relative' }}>
        <LoadingOverlay visible overlayBlur={2} />
      </Box>
    );
  }

  return (
    <Box>
      <Text size="sm" fw={500} mb="md">Memory Usage Timeline</Text>
      <svg ref={svgRef} style={{ width: '100%', height: height }} />
    </Box>
  );
};