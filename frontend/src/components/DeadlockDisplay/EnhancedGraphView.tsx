import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Paper, 
  Text, 
  Loader, 
  useMantineTheme, 
  Group,
  Badge,
  Tooltip,
  ActionIcon,
  Stack
} from '@mantine/core';
import { 
  IconAlertCircle,
  IconZoomIn, 
  IconZoomOut, 
  IconZoomReset,
  IconDownload
} from '@tabler/icons-react';
import * as d3 from 'd3';
import { DeadlockAnalysis, DeadlockProcess } from '../../types/deadlock';
import { api } from '../../api/unified';
import RenderingProgressIndicator from '../UI/RenderingProgressIndicator';

// Define interfaces
interface D3Node extends d3.SimulationNodeDatum {
  id: number;
  pid: number;
  inCycle: boolean;
  tableName?: string;
  lockType?: string;
  critical?: boolean;
  applicationName?: string;
  query?: string;
  waitEvent?: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | number;
  target: D3Node | number;
  inCycle: boolean;
  lockType?: string;
  lockMode?: string;
  tableName?: string;
}

interface EnhancedGraphViewProps {
  data?: DeadlockAnalysis;
  isLoading: boolean;
  eventId?: string;
}

/**
 * Enhanced interactive graph visualization of PostgreSQL deadlock with advanced features
 */
const EnhancedGraphView: React.FC<EnhancedGraphViewProps> = ({ data, isLoading, eventId }) => {
  const theme = useMantineTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  // Zoom control handlers
  const zoomInstance = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  // Handle zoom in button click
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomInstance.current) {
      d3.select(svgRef.current).transition().duration(300)
        .call(zoomInstance.current.scaleBy, 1.3);
    }
  }, []);
  
  // Handle zoom out button click
  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomInstance.current) {
      d3.select(svgRef.current).transition().duration(300)
        .call(zoomInstance.current.scaleBy, 0.7);
    }
  }, []);
  
  // Handle reset zoom button click
  const handleResetZoom = useCallback(() => {
    if (svgRef.current && zoomInstance.current && svgContainerRef.current) {
      const width = svgContainerRef.current.clientWidth;
      const height = svgContainerRef.current.clientHeight;
      const initialScale = 0.9;
      
      d3.select(svgRef.current).transition().duration(500)
        .call(zoomInstance.current.transform, d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(initialScale)
          .translate(-width / 2, -height / 2));
      
      setZoomLevel(initialScale);
    }
  }, []);
  
  // Handle SVG export
  const handleExportSVG = useCallback(async () => {
    if (!svgRef.current || !eventId) return;
    
    setExportStatus('loading');
    try {
      const result = await api.analyzers.exportDeadlockSVG(eventId, svgRef.current, {
        preserveTransform: true,
        includeMetadata: true,
        logExport: true
      });
      
      if (result.success) {
        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 2000);
      } else {
        setExportStatus('error');
        setError(result.error || 'Unknown error exporting SVG');
        setTimeout(() => setExportStatus('idle'), 3000);
      }
    } catch (error) {
      setExportStatus('error');
      setError(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  }, [eventId]);
  
  // Force simulation and cleanup
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  
  // Clean up simulation on component unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);
  
  // Create tooltip element
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Create tooltip div if it doesn't exist
    if (!tooltipRef.current) {
      tooltipRef.current = d3.select('body')
        .append('div')
        .attr('class', 'deadlock-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'white')
        .style('border', `1px solid ${theme.colors.gray[3]}`)
        .style('border-radius', '4px')
        .style('padding', '8px')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('max-width', '300px')
        .style('font-size', '12px')
        .node();
    }
    
    // Clean up tooltip on unmount
    return () => {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).remove();
        tooltipRef.current = null;
      }
    };
  }, [theme]);
  
  // State for progressive rendering
  const [renderingStatus, setRenderingStatus] = useState<'initial' | 'background' | 'nodes' | 'links' | 'labels' | 'complete'>('initial');
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [nodesRendered, setNodesRendered] = useState(0);
  const [linksRendered, setLinksRendered] = useState(0);
  
  // Threshold for progressive rendering
  const LARGE_GRAPH_THRESHOLD = 30; // If more than 30 nodes, use progressive rendering
  
  // Use D3 to create visualization when data changes
  useEffect(() => {
    // Skip rendering if loading or no data or SVG element
    if (isLoading || !data || !svgRef.current || !svgContainerRef.current) {
      return;
    }
    
    // Cleanup previous simulation if exists
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    
    // Reset rendering status
    setRenderingStatus('initial');
    setRenderingProgress(0);
    setNodesRendered(0);
    setLinksRendered(0);
    
    // Get reference to svg using d3
    const svg = d3.select(svgRef.current);
    
    // Clear previous visualization
    svg.selectAll('*').remove();
    
    // Set up the visualization
    const width = svgContainerRef.current.clientWidth;
    const height = svgContainerRef.current.clientHeight;
    
    // Create a group for zoom/pan behavior
    const g = svg.append('g')
      .attr('class', 'deadlock-container');
    
    // Initialize zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });
    
    // Store zoom instance for button controls
    zoomInstance.current = zoom;
    
    // Apply zoom to SVG
    svg.call(zoom)
       .on('dblclick.zoom', null); // Disable double-click zoom
    
    // Prepare data for D3 force simulation
    const vizData = data.visualization_data;
    if (!vizData || !vizData.processes || !Array.isArray(vizData.processes)) {
      return;
    }
    
    // Prepare nodes data
    const nodes: D3Node[] = vizData.processes.map(process => ({
      id: process.pid,
      pid: process.pid,
      inCycle: Boolean(process.inCycle),
      critical: Boolean(process.critical),
      tableName: process.tableName,
      lockType: process.lockType,
      applicationName: process.applicationName,
      query: process.query,
      waitEvent: process.waitEvent
    }));
    
    // Prepare links data
    const links: D3Link[] = [];
    
    // Process data to create edges between nodes
    vizData.processes.forEach(process => {
      if (process.blockingPids && Array.isArray(process.blockingPids)) {
        process.blockingPids.forEach(blockingPid => {
          links.push({
            source: process.pid,
            target: blockingPid,
            inCycle: Boolean(process.inCycle),
            lockType: process.lockType,
            lockMode: process.lockMode,
            tableName: process.tableName
          });
        });
      }
    });
    
    // Determine if this is a large graph that needs progressive rendering
    const isLargeGraph = nodes.length > LARGE_GRAPH_THRESHOLD;
    
    // Create groups for progressive rendering
    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const labelGroup = g.append('g').attr('class', 'labels');
    const defs = svg.append('defs');
    
    // Function for creating arrowhead markers
    const createArrowheads = () => {
      // Standard arrowhead
      defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', theme.colors.gray[6]);
      
      // Cycle arrowhead
      defs.append('marker')
        .attr('id', 'arrowhead-cycle')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', theme.colors.red[6]);
      
      // Critical arrowhead
      defs.append('marker')
        .attr('id', 'arrowhead-critical')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', theme.colors.orange[6]);
    };
    
    // Create a force simulation
    const simulation = d3.forceSimulation<D3Node, D3Link>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(30))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));
    
    // Store the simulation for cleanup
    simulationRef.current = simulation;
    
    // Group nodes by importance for progressive rendering
    const criticalNodes = nodes.filter(n => n.inCycle || n.critical);
    const regularNodes = nodes.filter(n => !n.inCycle && !n.critical);
    
    // Group links by importance for progressive rendering
    const criticalLinks = links.filter(l => l.inCycle || 
      nodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source))?.critical);
    const regularLinks = links.filter(l => !l.inCycle && 
      !nodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source))?.critical);
    
    // Create links (relationships) with event handlers
    const createLink = (link: D3Link) => {
      return linkGroup.append('line')
        .datum(link)
        .attr('class', 'link')
        .attr('stroke', d => {
          if (d.inCycle) return theme.colors.red[6];
          if (nodes.find(n => n.id === (typeof d.source === 'object' ? d.source.id : d.source))?.critical) {
            return theme.colors.orange[6];
          }
          return theme.colors.gray[6];
        })
        .attr('stroke-width', d => d.inCycle ? 2 : 1)
        .attr('marker-end', d => {
          if (d.inCycle) return 'url(#arrowhead-cycle)';
          if (nodes.find(n => n.id === (typeof d.source === 'object' ? d.source.id : d.source))?.critical) {
            return 'url(#arrowhead-critical)';
          }
          return 'url(#arrowhead)';
        })
        .attr('stroke-opacity', 0.6)
        .on('mouseover', function(event, d) {
          if (!tooltipRef.current) return;
          // Highlight the link
          d3.select(this)
            .attr('stroke-width', d.inCycle ? 3 : 2)
            .attr('stroke-opacity', 1);
            
          // Show tooltip with link information
          const sourceNode = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
          const targetNode = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
          
          let tooltipContent = `<div style="font-weight: bold;">Lock Relationship</div>`;
          tooltipContent += `<div>Source: Process ${sourceNode?.pid || '?'}</div>`;
          tooltipContent += `<div>Target: Process ${targetNode?.pid || '?'}</div>`;
          
          if (d.lockType) {
            tooltipContent += `<div>Lock Type: ${d.lockType}</div>`;
          }
          
          if (d.lockMode) {
            tooltipContent += `<div>Lock Mode: ${d.lockMode}</div>`;
          }
          
          if (d.tableName) {
            tooltipContent += `<div>Table: ${d.tableName}</div>`;
          }
          
          if (d.inCycle) {
            tooltipContent += `<div style="color: ${theme.colors.red[6]}; font-weight: bold; margin-top: 5px;">Part of Deadlock Cycle</div>`;
          }
          
          d3.select(tooltipRef.current)
            .html(tooltipContent)
            .style('visibility', 'visible')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
        })
        .on('mousemove', function(event) {
          if (!tooltipRef.current) return;
          d3.select(tooltipRef.current)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', function() {
          if (!tooltipRef.current) return;
          d3.select(this)
            .attr('stroke-width', d => d.inCycle ? 2 : 1)
            .attr('stroke-opacity', 0.6);
            
          d3.select(tooltipRef.current)
            .style('visibility', 'hidden');
        });
    };
    
    // Draw node backgrounds for better visibility
    const createNodeBackground = (node: D3Node) => {
      return nodeGroup.append('circle')
        .datum(node)
        .attr('class', 'node-background')
        .attr('r', 22)
        .attr('fill', 'white')
        .attr('stroke', 'none');
    };
    
    // Create node with event handlers
    const createNode = (node: D3Node) => {
      return nodeGroup.append('circle')
        .datum(node)
        .attr('class', 'node')
        .attr('r', node.critical ? 23 : 20)
        .attr('fill', d => {
          if (d.inCycle) return theme.colors.red[6];
          if (d.critical) return theme.colors.orange[6];
          return theme.colors.blue[6];
        })
        .attr('stroke', d => {
          if (d.inCycle) return theme.colors.red[8];
          if (d.critical) return theme.colors.orange[8];
          return theme.colors.blue[8];
        })
        .attr('stroke-width', d => d.inCycle || d.critical ? 2 : 1.5)
        .call(d3.drag<SVGCircleElement, D3Node>()
          .on('start', (event, d) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
            // Keep node fixed at drop position
            // To unfix, would set d.fx = null and d.fy = null
          })
        )
        .on('mouseover', function(event, d) {
          if (!tooltipRef.current) return;
          // Highlight the node
          d3.select(this)
            .attr('stroke-width', 3)
            .attr('r', d.critical ? 25 : 22);
            
          // Highlight connected links
          linkGroup.selectAll('line')
            .attr('stroke-opacity', l => {
              const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
              const targetId = typeof l.target === 'object' ? l.target.id : l.target;
              return (sourceId === d.id || targetId === d.id) ? 1 : 0.2;
            })
            .attr('stroke-width', l => {
              const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
              const targetId = typeof l.target === 'object' ? l.target.id : l.target;
              if (sourceId === d.id || targetId === d.id) {
                return l.inCycle ? 3 : 2;
              }
              return l.inCycle ? 2 : 1;
            });
            
          // Show tooltip with node information
          let tooltipContent = `<div style="font-weight: bold;">Process ${d.pid}</div>`;
          
          if (d.applicationName) {
            tooltipContent += `<div>App: ${d.applicationName}</div>`;
          }
          
          if (d.waitEvent) {
            tooltipContent += `<div>Wait Event: ${d.waitEvent}</div>`;
          }
          
          if (d.tableName) {
            tooltipContent += `<div>Table: ${d.tableName}</div>`;
          }
          
          if (d.lockType) {
            tooltipContent += `<div>Lock Type: ${d.lockType}</div>`;
          }
          
          if (d.query) {
            tooltipContent += `<div style="margin-top: 5px;">Query: <span style="font-family: monospace; font-size: 10px; word-break: break-all;">${d.query.substring(0, 100)}${d.query.length > 100 ? '...' : ''}</span></div>`;
          }
          
          if (d.inCycle) {
            tooltipContent += `<div style="color: ${theme.colors.red[6]}; font-weight: bold; margin-top: 5px;">Part of Deadlock Cycle</div>`;
          }
          
          if (d.critical) {
            tooltipContent += `<div style="color: ${theme.colors.orange[6]}; font-weight: bold; margin-top: 5px;">Critical Process</div>`;
          }
          
          d3.select(tooltipRef.current)
            .html(tooltipContent)
            .style('visibility', 'visible')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
        })
        .on('mousemove', function(event) {
          if (!tooltipRef.current) return;
          d3.select(tooltipRef.current)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', function() {
          if (!tooltipRef.current) return;
          d3.select(this)
            .attr('stroke-width', d.inCycle || d.critical ? 2 : 1.5)
            .attr('r', d.critical ? 23 : 20);
            
          // Reset link highlighting
          linkGroup.selectAll('line')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', l => l.inCycle ? 2 : 1);
            
          d3.select(tooltipRef.current)
            .style('visibility', 'hidden');
        });
    };
    
    // Create label for node
    const createNodeLabel = (node: D3Node) => {
      // Create PID label
      labelGroup.append('text')
        .datum(node)
        .attr('class', 'pid-label')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .text(node.pid);
      
      // Create table label if available
      if (node.tableName) {
        labelGroup.append('text')
          .datum(node)
          .attr('class', 'table-label')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('y', 34)
          .attr('fill', theme.colors.dark[8])
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .text(node.tableName);
      }
    };
    
    // Progressive rendering function
    const progressiveRender = () => {
      // First, create the arrowhead markers (always done first, once)
      if (renderingStatus === 'initial') {
        createArrowheads();
        setRenderingStatus('background');
        setRenderingProgress(5);
        requestAnimationFrame(progressiveRender);
        return;
      }
      
      // Render node backgrounds first for better visibility
      if (renderingStatus === 'background') {
        // For small graphs, render all at once
        if (!isLargeGraph) {
          nodes.forEach(createNodeBackground);
          setRenderingStatus('nodes');
          setRenderingProgress(20);
          requestAnimationFrame(progressiveRender);
          return;
        }
        
        // For large graphs, render critical nodes first, then regular ones
        if (nodesRendered < criticalNodes.length) {
          // Render a batch of critical node backgrounds
          const batchSize = Math.min(5, criticalNodes.length - nodesRendered);
          const batch = criticalNodes.slice(nodesRendered, nodesRendered + batchSize);
          batch.forEach(createNodeBackground);
          
          const newCount = nodesRendered + batchSize;
          setNodesRendered(newCount);
          setRenderingProgress(5 + (newCount / nodes.length * 15));
          requestAnimationFrame(progressiveRender);
          return;
        }
        
        if (nodesRendered < nodes.length) {
          // Start rendering regular node backgrounds
          const remainingToRender = nodes.length - nodesRendered;
          const batchSize = Math.min(10, remainingToRender);
          const startIndex = nodesRendered - criticalNodes.length;
          const batch = regularNodes.slice(startIndex, startIndex + batchSize);
          batch.forEach(createNodeBackground);
          
          const newCount = nodesRendered + batchSize;
          setNodesRendered(newCount);
          setRenderingProgress(5 + (newCount / nodes.length * 15));
          
          // If we've rendered all node backgrounds, move to nodes
          if (newCount >= nodes.length) {
            setRenderingStatus('nodes');
            setNodesRendered(0); // Reset counter for nodes
            setRenderingProgress(20);
          }
          
          requestAnimationFrame(progressiveRender);
          return;
        }
      }
      
      // Render nodes (circles)
      if (renderingStatus === 'nodes') {
        // For small graphs, render all at once
        if (!isLargeGraph) {
          nodes.forEach(createNode);
          setRenderingStatus('links');
          setRenderingProgress(40);
          requestAnimationFrame(progressiveRender);
          return;
        }
        
        // For large graphs, render critical nodes first, then regular ones
        if (nodesRendered < criticalNodes.length) {
          // Render a batch of critical nodes
          const batchSize = Math.min(5, criticalNodes.length - nodesRendered);
          const batch = criticalNodes.slice(nodesRendered, nodesRendered + batchSize);
          batch.forEach(createNode);
          
          const newCount = nodesRendered + batchSize;
          setNodesRendered(newCount);
          setRenderingProgress(20 + (newCount / nodes.length * 20));
          requestAnimationFrame(progressiveRender);
          return;
        }
        
        if (nodesRendered < nodes.length) {
          // Start rendering regular nodes
          const remainingToRender = nodes.length - nodesRendered;
          const batchSize = Math.min(10, remainingToRender);
          const startIndex = nodesRendered - criticalNodes.length;
          const batch = regularNodes.slice(startIndex, startIndex + batchSize);
          batch.forEach(createNode);
          
          const newCount = nodesRendered + batchSize;
          setNodesRendered(newCount);
          setRenderingProgress(20 + (newCount / nodes.length * 20));
          
          // If we've rendered all nodes, move to links
          if (newCount >= nodes.length) {
            setRenderingStatus('links');
            setLinksRendered(0); // Reset counter for links
            setRenderingProgress(40);
          }
          
          requestAnimationFrame(progressiveRender);
          return;
        }
      }
      
      // Render links (relationships)
      if (renderingStatus === 'links') {
        // For small graphs, render all at once
        if (!isLargeGraph) {
          links.forEach(createLink);
          setRenderingStatus('labels');
          setRenderingProgress(70);
          requestAnimationFrame(progressiveRender);
          return;
        }
        
        // For large graphs, render critical links first, then regular ones
        if (linksRendered < criticalLinks.length) {
          // Render a batch of critical links
          const batchSize = Math.min(5, criticalLinks.length - linksRendered);
          const batch = criticalLinks.slice(linksRendered, linksRendered + batchSize);
          batch.forEach(createLink);
          
          const newCount = linksRendered + batchSize;
          setLinksRendered(newCount);
          setRenderingProgress(40 + (newCount / links.length * 30));
          requestAnimationFrame(progressiveRender);
          return;
        }
        
        if (linksRendered < links.length) {
          // Start rendering regular links
          const remainingToRender = links.length - linksRendered;
          const batchSize = Math.min(10, remainingToRender);
          const startIndex = linksRendered - criticalLinks.length;
          const batch = regularLinks.slice(startIndex, startIndex + batchSize);
          batch.forEach(createLink);
          
          const newCount = linksRendered + batchSize;
          setLinksRendered(newCount);
          setRenderingProgress(40 + (newCount / links.length * 30));
          
          // If we've rendered all links, move to labels
          if (newCount >= links.length) {
            setRenderingStatus('labels');
            setNodesRendered(0); // Reset counter for labels
            setRenderingProgress(70);
          }
          
          requestAnimationFrame(progressiveRender);
          return;
        }
      }
      
      // Render labels (final step)
      if (renderingStatus === 'labels') {
        // For small graphs, render all at once
        if (!isLargeGraph) {
          nodes.forEach(createNodeLabel);
          setRenderingStatus('complete');
          setRenderingProgress(100);
          
          // Center the visualization
          const initialScale = 0.9;
          svg.call(zoom.transform, d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(initialScale)
            .translate(-width / 2, -height / 2));
          
          setZoomLevel(initialScale);
          return;
        }
        
        // For large graphs, render a batch of labels at a time
        if (nodesRendered < nodes.length) {
          const batchSize = Math.min(10, nodes.length - nodesRendered);
          const batch = nodes.slice(nodesRendered, nodesRendered + batchSize);
          batch.forEach(createNodeLabel);
          
          const newCount = nodesRendered + batchSize;
          setNodesRendered(newCount);
          setRenderingProgress(70 + (newCount / nodes.length * 30));
          
          // If we've rendered all labels, mark as complete
          if (newCount >= nodes.length) {
            setRenderingStatus('complete');
            setRenderingProgress(100);
            
            // Center the visualization
            const initialScale = 0.9;
            svg.call(zoom.transform, d3.zoomIdentity
              .translate(width / 2, height / 2)
              .scale(initialScale)
              .translate(-width / 2, -height / 2));
            
            setZoomLevel(initialScale);
          } else {
            requestAnimationFrame(progressiveRender);
          }
          return;
        }
      }
    };
    
    // Start the progressive rendering process
    requestAnimationFrame(progressiveRender);
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      // Update link positions
      linkGroup.selectAll('line')
        .attr('x1', d => typeof d.source === 'object' ? d.source.x || 0 : 0)
        .attr('y1', d => typeof d.source === 'object' ? d.source.y || 0 : 0)
        .attr('x2', d => typeof d.target === 'object' ? d.target.x || 0 : 0)
        .attr('y2', d => typeof d.target === 'object' ? d.target.y || 0 : 0);
      
      // Update node positions
      nodeGroup.selectAll('circle.node')
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);
      
      // Update node background positions
      nodeGroup.selectAll('circle.node-background')
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);
      
      // Update label positions
      labelGroup.selectAll('text.pid-label')
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0);
      
      // Update table labels
      labelGroup.selectAll('text.table-label')
        .attr('x', d => d.x || 0)
        .attr('y', d => (d.y || 0) + 34);
    });
    
    // The progressive rendering function replaces these direct selections
    // Labels are now created during the progressive rendering process
    // and the simulation tick function has already been defined above
    
    // Center the visualization
    const initialScale = 0.9;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale)
      .translate(-width / 2, -height / 2));
    
    setZoomLevel(initialScale);
    
    // Make simulation run a bit then slow down
    simulation.alpha(1).restart();
    setTimeout(() => {
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
    }, 3000);
    
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
  if (!data || !data.visualization_data?.processes?.length === 0) {
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
  
  // Calculate cycle count if available
  const cycleCount = data.visualization_data?.processes?.filter(p => p.inCycle)?.length || 0;
  const criticalCount = data.visualization_data?.processes?.filter(p => p.critical)?.length || 0;
  
  return (
    <Paper p="md" withBorder style={{ overflow: 'hidden' }}>
      <Group position="apart" mb="md">
        <Group spacing="xs">
          <Text fw={600}>Deadlock Graph Visualization</Text>
          {cycleCount > 0 && (
            <Badge color="red">{cycleCount} processes in cycle</Badge>
          )}
          {criticalCount > 0 && (
            <Badge color="orange">{criticalCount} critical processes</Badge>
          )}
        </Group>
        
        {/* Zoom and Export Controls */}
        <Group spacing="xs">
          <Tooltip label="Zoom in">
            <ActionIcon 
              variant="light" 
              onClick={handleZoomIn} 
              aria-label="Zoom in"
            >
              <IconZoomIn size={16} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Zoom out">
            <ActionIcon 
              variant="light" 
              onClick={handleZoomOut} 
              aria-label="Zoom out"
            >
              <IconZoomOut size={16} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Reset view">
            <ActionIcon 
              variant="light" 
              onClick={handleResetZoom} 
              aria-label="Reset view"
            >
              <IconZoomReset size={16} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip 
            label={
              exportStatus === 'loading' ? 'Exporting...' :
              exportStatus === 'success' ? 'Exported successfully!' :
              exportStatus === 'error' ? error || 'Export failed' :
              'Export as SVG'
            }
          >
            <ActionIcon 
              variant="light" 
              onClick={handleExportSVG} 
              aria-label="Export as SVG"
              loading={exportStatus === 'loading'}
              color={
                exportStatus === 'success' ? 'green' :
                exportStatus === 'error' ? 'red' :
                'blue'
              }
              disabled={!eventId || !svgRef.current}
            >
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      
      <div 
        className="deadlock-graph" 
        style={{ height: '500px', position: 'relative' }}
        ref={svgContainerRef}
      >
        {/* Rendering progress indicator */}
        <RenderingProgressIndicator 
          progress={renderingProgress}
          status={renderingStatus}
          position="top-left"
        />
        <svg 
          ref={svgRef} 
          width="100%" 
          height="100%"
          style={{ 
            display: 'block',
            cursor: 'grab'
          }}
        />
        
        {/* Enhanced Legend */}
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          border: `1px solid ${theme.colors.gray[3]}`,
          fontSize: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Text size="xs" fw={600} mb={8}>Legend</Text>
          
          <Stack spacing={6}>
            <Group spacing="xs" noWrap>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: theme.colors.blue[6],
                border: `1px solid ${theme.colors.blue[8]}`
              }}></div>
              <Text size="xs">Process</Text>
            </Group>
            
            <Group spacing="xs" noWrap>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: theme.colors.red[6],
                border: `1px solid ${theme.colors.red[8]}`
              }}></div>
              <Text size="xs">Process in Deadlock</Text>
            </Group>
            
            <Group spacing="xs" noWrap>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: theme.colors.orange[6],
                border: `1px solid ${theme.colors.orange[8]}`
              }}></div>
              <Text size="xs">Critical Process</Text>
            </Group>
            
            <Group spacing="xs" noWrap>
              <div style={{
                width: '20px',
                height: '2px',
                backgroundColor: theme.colors.red[6]
              }}></div>
              <Text size="xs">Deadlock Relation</Text>
            </Group>
            
            <Group spacing="xs" noWrap>
              <div style={{
                width: '20px',
                height: '2px',
                backgroundColor: theme.colors.orange[6]
              }}></div>
              <Text size="xs">Critical Relation</Text>
            </Group>
            
            <Group spacing="xs" noWrap>
              <div style={{
                width: '20px',
                height: '2px',
                backgroundColor: theme.colors.gray[6]
              }}></div>
              <Text size="xs">Waiting Relation</Text>
            </Group>
          </Stack>
        </div>
        
        {/* Current Zoom Status */}
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          left: '10px',
          background: 'rgba(255, 255, 255, 0.7)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          <Text size="xs" color="dimmed">Zoom: {Math.round(zoomLevel * 100)}%</Text>
        </div>
      </div>
      
      <Text size="xs" color="dimmed" mt="xs" align="right">
        Tip: Drag to pan, scroll to zoom, hover for details
      </Text>
    </Paper>
  );
};

export default React.memo(EnhancedGraphView);
