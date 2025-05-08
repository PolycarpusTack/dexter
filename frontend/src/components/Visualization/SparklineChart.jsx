// File: frontend/src/components/Visualization/SparklineChart.jsx

import React, { useEffect, useRef } from 'react';
import { Box, Text, Skeleton, useMantineTheme } from '@mantine/core';
import * as d3 from 'd3';

/**
 * SparklineChart component for visualizing event frequency
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.data - Array of { timestamp, count } objects
 * @param {string} props.timeRange - Time range displayed (e.g., '24h', '7d')
 * @param {number} props.height - Height of the chart (default: 40)
 * @param {number} props.width - Width of the chart (default: 120)
 * @param {boolean} props.showTrend - Show trend indicator (default: true)
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.color - Color of the line (default: theme.colors.red[6])
 */
function SparklineChart({ 
  data = [], 
  timeRange = '24h', 
  height = 40, 
  width = 120, 
  showTrend = true,
  isLoading = false,
  color = null,
}) {
  const theme = useMantineTheme();
  const svgRef = useRef(null);
  const lineColor = color || theme.colors.red[6];
  
  // Calculate trend (percentage change)
  const calculateTrend = () => {
    if (data.length < 2) return 0;
    
    // Get first and last values
    const firstValue = data[0].count;
    const lastValue = data[data.length - 1].count;
    
    // Avoid division by zero
    if (firstValue === 0) return lastValue > 0 ? 100 : 0;
    
    // Calculate percentage change
    return Math.round(((lastValue - firstValue) / firstValue) * 100);
  };
  
  const trend = calculateTrend();

  // Draw the sparkline chart
  useEffect(() => {
    if (isLoading || data.length === 0 || !svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Set dimensions
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom - (showTrend ? 15 : 0);

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)))
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.count) * 1.1]) // Add 10% padding
      .range([chartHeight, 0]);

    // Create line generator
    const line = d3
      .line()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.count))
      .curve(d3.curveMonotoneX); // Smooth curve

    // Draw line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots for significant points
    if (trend !== 0) {
      svg
        .selectAll(".dot")
        .data(data.filter((d, i) => i === 0 || i === data.length - 1 || d.count === d3.max(data, d => d.count)))
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(new Date(d.timestamp)))
        .attr("cy", d => yScale(d.count))
        .attr("r", 3)
        .attr("fill", lineColor);
    }

  }, [data, width, height, lineColor, isLoading, showTrend, trend]);

  if (isLoading) {
    return <Skeleton width={width} height={height} />;
  }

  if (data.length === 0) {
    return (
      <Box w={width} h={height} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text size="xs" color="dimmed">No data</Text>
      </Box>
    );
  }

  return (
    <Box w={width} h={height}>
      <svg ref={svgRef} width={width} height={height - (showTrend ? 15 : 0)} />
      {showTrend && (
        <Text 
          size="xs" 
          c={trend > 0 ? "red" : trend < 0 ? "green" : "dimmed"}
          ta="right"
          fw={500}
        >
          {trend > 0 
            ? `↑ ${trend}%` 
            : trend < 0 
              ? `↓ ${Math.abs(trend)}%` 
              : '—'}
        </Text>
      )}
    </Box>
  );
}

export default SparklineChart;
