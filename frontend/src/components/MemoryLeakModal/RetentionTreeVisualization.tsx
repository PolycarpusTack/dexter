import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Text, LoadingOverlay, Group, Badge } from '@mantine/core';

interface RetentionPath {
  object_id: string;
  path: Array<{
    object_id: string;
    type: string;
    name: string;
    size: number;
    property: string;
  }>;
  retained_size: number;
  leak_probability: number;
}

interface LeakPattern {
  type: string;
  confidence: number;
  affected_objects: string[];
  total_retained_size: number;
  description: string;
}

interface RetentionTreeVisualizationProps {
  retentionPaths: RetentionPath[];
  leakPatterns: LeakPattern[];
  height?: number;
}

interface TreeNode {
  id: string;
  name: string;
  type: string;
  size: number;
  leak_probability: number;
  children?: TreeNode[];
  parent?: TreeNode;
  x?: number;
  y?: number;
  depth?: number;
}

export const RetentionTreeVisualization: React.FC<RetentionTreeVisualizationProps> = ({
  retentionPaths,
  leakPatterns,
  height = 500
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!retentionPaths.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 90, bottom: 30, left: 90 };
    const width = 800 - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Build tree data from retention paths
    const treeData = buildTreeFromPaths(retentionPaths.slice(0, 5)); // Limit for performance

    if (!treeData) {
      g.append('text')
        .attr('x', width / 2)
        .attr('y', chartHeight / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#666')
        .text('No retention paths available');
      return;
    }

    // Create tree layout
    const treemap = d3.tree<TreeNode>().size([chartHeight, width]);
    const root = d3.hierarchy(treeData, d => d.children);
    treemap(root);

    // Add links
    const link = g.selectAll('.link')
      .data(root.descendants().slice(1))
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        return "M" + d.y + "," + d.x
          + "C" + (d.y + d.parent.y) / 2 + "," + d.x
          + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
          + " " + d.parent.y + "," + d.parent.x;
      })
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', d => Math.max(1, (d.data.leak_probability || 0.1) * 3));

    // Add nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

    // Add circles
    node.append('circle')
      .attr('r', d => Math.max(3, Math.min(15, Math.sqrt(d.data.size / 1000))))
      .style('fill', d => {
        const prob = d.data.leak_probability || 0;
        if (prob > 0.8) return '#ef4444';
        if (prob > 0.5) return '#f59e0b';
        if (prob > 0.2) return '#eab308';
        return '#6b7280';
      })
      .style('stroke', '#fff')
      .style('stroke-width', 2);

    // Add labels
    node.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children ? -13 : 13)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', '10px')
      .style('fill', '#333')
      .text(d => {
        const name = d.data.name || d.data.type || 'Object';
        return name.length > 20 ? name.substring(0, 17) + '...' : name;
      });

    // Add size labels
    node.append('text')
      .attr('dy', '1.5em')
      .attr('x', d => d.children ? -13 : 13)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', '8px')
      .style('fill', '#666')
      .text(d => d.data.size > 0 ? formatBytes(d.data.size) : '');

    // Add tooltip on hover
    node.on('mouseover', function(event, d) {
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', 1000);

      tooltip.html(`
        <strong>${d.data.name || d.data.type}</strong><br/>
        Size: ${formatBytes(d.data.size)}<br/>
        Leak Probability: ${((d.data.leak_probability || 0) * 100).toFixed(1)}%<br/>
        Type: ${d.data.type}
      `);

      const [mouseX, mouseY] = d3.pointer(event, document.body);
      tooltip
        .style('left', (mouseX + 10) + 'px')
        .style('top', (mouseY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.selectAll('.tooltip').remove();
    });

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 120}, 20)`);

    const legendData = [
      { color: '#ef4444', label: 'High Risk', threshold: '> 80%' },
      { color: '#f59e0b', label: 'Medium Risk', threshold: '50-80%' },
      { color: '#eab308', label: 'Low Risk', threshold: '20-50%' },
      { color: '#6b7280', label: 'Normal', threshold: '< 20%' }
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('circle')
        .attr('r', 6)
        .style('fill', item.color);

      legendItem.append('text')
        .attr('x', 12)
        .attr('y', 4)
        .style('font-size', '10px')
        .text(`${item.label} (${item.threshold})`);
    });

  }, [retentionPaths, leakPatterns, height]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const buildTreeFromPaths = (paths: RetentionPath[]): TreeNode | null => {
    if (!paths.length) return null;

    // Use the first path as the main tree structure
    const mainPath = paths[0];
    if (!mainPath.path.length) return null;

    // Build tree from path
    const root: TreeNode = {
      id: 'root',
      name: 'GC Root',
      type: 'Root',
      size: 0,
      leak_probability: 0,
      children: []
    };

    let current = root;
    
    mainPath.path.forEach((step, index) => {
      const node: TreeNode = {
        id: step.object_id,
        name: step.name || step.type,
        type: step.type,
        size: step.size,
        leak_probability: mainPath.leak_probability,
        children: index === mainPath.path.length - 1 ? undefined : []
      };

      current.children = current.children || [];
      current.children.push(node);
      current = node;
    });

    // Add branches from other paths that share common nodes
    paths.slice(1).forEach(path => {
      addPathToBranch(root, path);
    });

    return root;
  };

  const addPathToBranch = (root: TreeNode, path: RetentionPath) => {
    // Find the deepest common node and add the rest as a branch
    // This is a simplified implementation - a full implementation would
    // properly merge paths that share common prefixes
    
    let current = root;
    let pathIndex = 0;
    
    // Traverse as far as we can in the existing tree
    while (current.children && pathIndex < path.path.length) {
      const step = path.path[pathIndex];
      const existingChild = current.children.find(child => child.id === step.object_id);
      
      if (existingChild) {
        current = existingChild;
        pathIndex++;
      } else {
        break;
      }
    }
    
    // Add the remaining path as a new branch
    for (let i = pathIndex; i < path.path.length; i++) {
      const step = path.path[i];
      const node: TreeNode = {
        id: step.object_id + '_branch',
        name: step.name || step.type,
        type: step.type,
        size: step.size,
        leak_probability: path.leak_probability,
        children: i === path.path.length - 1 ? undefined : []
      };
      
      current.children = current.children || [];
      current.children.push(node);
      current = node;
    }
  };

  if (!retentionPaths.length) {
    return (
      <Box style={{ height, position: 'relative' }}>
        <Text size="sm" color="dimmed" ta="center" mt="xl">
          No retention paths available
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Group position="apart" mb="md">
        <Text size="sm" fw={500}>Object Retention Tree</Text>
        <Group spacing="xs">
          <Badge size="sm" variant="outline">
            {retentionPaths.length} paths
          </Badge>
          <Badge size="sm" color="red">
            Avg {((retentionPaths.reduce((sum, p) => sum + p.leak_probability, 0) / retentionPaths.length) * 100).toFixed(0)}% leak risk
          </Badge>
        </Group>
      </Group>
      <Text size="xs" color="dimmed" mb="sm">
        Shows object reference chains preventing garbage collection. 
        Larger circles indicate bigger objects, colors show leak probability.
      </Text>
      <svg ref={svgRef} style={{ width: '100%', height: height }} />
    </Box>
  );
};