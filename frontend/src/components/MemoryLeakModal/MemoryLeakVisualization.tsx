import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Text, Center, Loader, Stack } from '@mantine/core';

interface MemoryLeakVisualizationProps {
  data: {
    timestamps: string[];
    total_memory: number[];
    used_memory: number[];
    objects: Array<{
      name: string;
      counts: number[];
      sizes: number[];
    }>;
    leaking_objects: Array<{
      name: string;
      count: number;
      size_bytes: number;
      growth_rate: number;
      retention_paths: string[];
    }>;
  };
  svgRef?: React.RefObject<SVGSVGElement>;
}

const MemoryLeakVisualization: React.FC<MemoryLeakVisualizationProps> = ({ data, svgRef }) => {
  const memoryChartRef = useRef<HTMLDivElement>(null);
  const objectCountsRef = useRef<HTMLDivElement>(null);
  const localSvgRef = useRef<SVGSVGElement>(null);
  
  // Use provided svgRef or local one
  const effectiveSvgRef = svgRef || localSvgRef;
  
  useEffect(() => {
    if (!data || !memoryChartRef.current || !objectCountsRef.current) return;
    
    // Clear previous visualizations
    d3.select(memoryChartRef.current).selectAll('*').remove();
    d3.select(objectCountsRef.current).selectAll('*').remove();
    
    // Create memory usage chart
    createMemoryUsageChart();
    
    // Create object counts chart
    createObjectCountsChart();
    
    // Function to create memory usage chart
    function createMemoryUsageChart() {
      const container = memoryChartRef.current;
      if (!container) return;
      
      const width = container.clientWidth;
      const height = 200;
      const margin = { top: 20, right: 30, bottom: 40, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height]);
      
      // Save reference
      if (effectiveSvgRef.current === null) {
        effectiveSvgRef.current = svg.node() as SVGSVGElement;
      }
      
      // Create scales
      const xScale = d3.scaleBand()
        .domain(data.timestamps)
        .range([margin.left, width - margin.right])
        .padding(0.1);
      
      const yScale = d3.scaleLinear()
        .domain([0, Math.max(...data.total_memory) * 1.1]) // Add 10% padding
        .range([height - margin.bottom, margin.top]);
      
      // Create a group for the chart
      const g = svg.append('g');
      
      // Add x-axis
      g.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0))
        .call(g => g.selectAll('.domain').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick text')
          .attr('fill', '#999')
          .style('font-size', '10px')
        );
      
      // Add y-axis
      g.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale)
          .tickFormat(d => formatBytes(d as number))
          .tickSizeOuter(0)
        )
        .call(g => g.selectAll('.domain').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick text')
          .attr('fill', '#999')
          .style('font-size', '10px')
        );
      
      // Add y-axis label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', margin.left / 3)
        .attr('x', -(height / 2))
        .attr('text-anchor', 'middle')
        .attr('fill', '#999')
        .style('font-size', '12px')
        .text('Memory Usage');
      
      // Add total memory bars
      g.selectAll('.bar-total')
        .data(data.total_memory)
        .enter()
        .append('rect')
        .attr('class', 'bar-total')
        .attr('x', (_, i) => xScale(data.timestamps[i]) || 0)
        .attr('y', d => yScale(d))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - margin.bottom - yScale(d))
        .attr('fill', '#a5d8ff')
        .attr('stroke', '#74c0fc')
        .attr('stroke-width', 1)
        .attr('opacity', 0.7);
      
      // Add used memory bars
      g.selectAll('.bar-used')
        .data(data.used_memory)
        .enter()
        .append('rect')
        .attr('class', 'bar-used')
        .attr('x', (_, i) => xScale(data.timestamps[i]) || 0)
        .attr('y', d => yScale(d))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - margin.bottom - yScale(d))
        .attr('fill', '#ff8787')
        .attr('stroke', '#fa5252')
        .attr('stroke-width', 1)
        .attr('opacity', 0.7);
      
      // Add legend
      const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right - 150}, ${margin.top})`);
      
      // Total memory legend
      legend.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', '#a5d8ff')
        .attr('stroke', '#74c0fc')
        .attr('stroke-width', 1);
      
      legend.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .attr('fill', '#777')
        .style('font-size', '12px')
        .text('Total Memory');
      
      // Used memory legend
      legend.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('y', 20)
        .attr('fill', '#ff8787')
        .attr('stroke', '#fa5252')
        .attr('stroke-width', 1);
      
      legend.append('text')
        .attr('x', 20)
        .attr('y', 32)
        .attr('fill', '#777')
        .style('font-size', '12px')
        .text('Used Memory');
    }
    
    // Function to create object counts chart
    function createObjectCountsChart() {
      const container = objectCountsRef.current;
      if (!container) return;
      
      const width = container.clientWidth;
      const height = 200;
      const margin = { top: 20, right: 100, bottom: 40, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height]);
      
      // Create scales
      const xScale = d3.scalePoint()
        .domain(data.timestamps)
        .range([margin.left, width - margin.right]);
      
      // Find the max count across all objects
      const maxCount = Math.max(
        ...data.objects.map(obj => Math.max(...obj.counts))
      );
      
      const yScale = d3.scaleLinear()
        .domain([0, maxCount * 1.1]) // Add 10% padding
        .range([height - margin.bottom, margin.top]);
      
      // Create line generator
      const line = d3.line()
        .x((_, i) => xScale(data.timestamps[i]) || 0)
        .y(d => yScale(d as number))
        .curve(d3.curveMonotoneX);
      
      // Create a group for the chart
      const g = svg.append('g');
      
      // Add x-axis
      g.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0))
        .call(g => g.selectAll('.domain').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick text')
          .attr('fill', '#999')
          .style('font-size', '10px')
        );
      
      // Add y-axis
      g.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale)
          .tickFormat(d => formatNumber(d as number))
          .tickSizeOuter(0)
        )
        .call(g => g.selectAll('.domain').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#aaa'))
        .call(g => g.selectAll('.tick text')
          .attr('fill', '#999')
          .style('font-size', '10px')
        );
      
      // Add y-axis label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', margin.left / 3)
        .attr('x', -(height / 2))
        .attr('text-anchor', 'middle')
        .attr('fill', '#999')
        .style('font-size', '12px')
        .text('Object Count');
      
      // Define colors for object types
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      
      // Draw lines for each object type
      data.objects.forEach((obj, i) => {
        const color = colorScale(i.toString());
        
        // Draw line
        g.append('path')
          .datum(obj.counts)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('d', line);
        
        // Add dots at each data point
        g.selectAll(`.dot-${i}`)
          .data(obj.counts)
          .enter()
          .append('circle')
          .attr('class', `dot-${i}`)
          .attr('cx', (_, j) => xScale(data.timestamps[j]) || 0)
          .attr('cy', d => yScale(d))
          .attr('r', 4)
          .attr('fill', color);
      });
      
      // Add legend
      const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);
      
      data.objects.forEach((obj, i) => {
        const color = colorScale(i.toString());
        
        // Is this a leaking object?
        const isLeaking = data.leaking_objects.some(leak => leak.name === obj.name);
        
        // Add color marker
        legend.append('line')
          .attr('x1', 0)
          .attr('y1', i * 20)
          .attr('x2', 15)
          .attr('y2', i * 20)
          .attr('stroke', color)
          .attr('stroke-width', 2);
        
        // Add object name
        legend.append('text')
          .attr('x', 20)
          .attr('y', i * 20 + 4)
          .attr('fill', isLeaking ? '#fa5252' : '#777')
          .style('font-size', '12px')
          .style('font-weight', isLeaking ? 'bold' : 'normal')
          .text(truncateString(obj.name, 15));
      });
    }
    
  }, [data]);
  
  if (!data) {
    return (
      <Center style={{ height: '100%' }}>
        <Loader />
      </Center>
    );
  }
  
  if (!data.timestamps || data.timestamps.length === 0) {
    return (
      <Center style={{ height: '100%' }}>
        <Text>No data available for visualization</Text>
      </Center>
    );
  }
  
  return (
    <Stack spacing="xs" style={{ width: '100%', height: '100%' }}>
      <div 
        ref={memoryChartRef} 
        style={{ width: '100%', height: '50%', minHeight: 200 }}
      />
      <div 
        ref={objectCountsRef} 
        style={{ width: '100%', height: '50%', minHeight: 200 }}
      />
    </Stack>
  );
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return bytes.toFixed(0) + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

// Helper function to format numbers
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  } else {
    return value.toString();
  }
}

// Helper function to truncate strings
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

export default MemoryLeakVisualization;