// File: frontend/src/components/PromiseRejectionModal/PromiseFlowVisualization.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Paper, Text, Group, Badge, Stack, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import * as d3 from 'd3';
import type { VisualizationData } from '../../types/analyzers';

interface PromiseFlowVisualizationProps {
  data: VisualizationData;
}

interface FlowNode {
  id: string;
  label: string;
  type: 'creation' | 'async' | 'rejection' | 'missing';
  status: 'normal' | 'error' | 'warning';
}

interface FlowEdge {
  source: string;
  target: string;
  label: string;
  style?: 'solid' | 'dashed';
}

export const PromiseFlowVisualization: React.FC<PromiseFlowVisualizationProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  const flowData = data.data.flow as { nodes: FlowNode[]; edges: FlowEdge[] };
  const patterns = data.data.patterns as Array<{ pattern: string; detected: boolean; severity: string }>;

  useEffect(() => {
    // Update dimensions based on container
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width - 40, 400), height: 400 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !flowData.nodes.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define arrow markers
    svg.append('defs').selectAll('marker')
      .data(['normal', 'error', 'warning'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => {
        switch (d) {
          case 'error': return '#fa5252';
          case 'warning': return '#fd7e14';
          default: return '#868e96';
        }
      });

    // Calculate node positions
    const nodeSpacing = innerWidth / (flowData.nodes.length + 1);
    const nodePositions = new Map<string, { x: number; y: number }>();

    flowData.nodes.forEach((node, index) => {
      const x = nodeSpacing * (index + 1);
      let y = innerHeight / 2;
      
      // Adjust y position based on node type
      if (node.type === 'missing') {
        y = innerHeight * 0.8;
      } else if (node.type === 'rejection') {
        y = innerHeight * 0.6;
      }
      
      nodePositions.set(node.id, { x, y });
    });

    // Draw edges
    const edgeGroup = g.append('g').attr('class', 'edges');
    
    flowData.edges.forEach(edge => {
      const source = nodePositions.get(edge.source);
      const target = nodePositions.get(edge.target);
      
      if (!source || !target) return;
      
      const path = edgeGroup.append('path')
        .attr('d', `M${source.x},${source.y} L${target.x},${target.y}`)
        .attr('stroke', '#868e96')
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr('marker-end', 'url(#arrow-normal)');
      
      if (edge.style === 'dashed') {
        path.attr('stroke-dasharray', '5,5');
      }
      
      // Add edge label
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      
      edgeGroup.append('text')
        .attr('x', midX)
        .attr('y', midY - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#495057')
        .text(edge.label);
    });

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    
    flowData.nodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;
      
      const nodeG = nodeGroup.append('g')
        .attr('transform', `translate(${pos.x},${pos.y})`);
      
      // Node circle
      const color = node.status === 'error' ? '#ffe3e3' : 
                   node.status === 'warning' ? '#fff4e6' : 
                   '#e7f5ff';
      const strokeColor = node.status === 'error' ? '#fa5252' : 
                         node.status === 'warning' ? '#fd7e14' : 
                         '#339af0';
      
      nodeG.append('circle')
        .attr('r', 30)
        .attr('fill', color)
        .attr('stroke', strokeColor)
        .attr('stroke-width', 2);
      
      // Node icon based on type
      const icon = node.type === 'creation' ? '🎯' :
                   node.type === 'async' ? '⚡' :
                   node.type === 'rejection' ? '❌' :
                   node.type === 'missing' ? '❓' : '';
      
      nodeG.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('font-size', '20px')
        .text(icon);
      
      // Node label
      nodeG.append('text')
        .attr('y', 45)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#495057')
        .text(node.label);
    });

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#212529')
      .text('Promise Execution Flow');

  }, [flowData, dimensions]);

  return (
    <Stack spacing="md">
      <Paper p="md" withBorder>
        <div ref={containerRef}>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{ display: 'block', margin: '0 auto' }}
          />
        </div>
      </Paper>

      {patterns && patterns.length > 0 && (
        <Paper p="md" withBorder>
          <Text weight={600} mb="sm">Detected Anti-Patterns</Text>
          <Group spacing="xs">
            {patterns.map((pattern, index) => (
              <Badge
                key={index}
                color={
                  pattern.severity === 'high' ? 'red' :
                  pattern.severity === 'medium' ? 'orange' :
                  'blue'
                }
                variant="light"
              >
                {pattern.pattern}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          This visualization shows the promise lifecycle from creation to rejection.
          Red nodes indicate errors, orange nodes show warnings, and blue nodes represent normal operations.
        </Text>
      </Alert>
    </Stack>
  );
};