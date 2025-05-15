# D3 Visualization for Dummies: Deadlock Graph

This guide explains how we implement and optimize D3.js visualizations for the deadlock analyzer.

## What is D3.js?

D3 (Data-Driven Documents) is a JavaScript library for creating dynamic, interactive data visualizations in web browsers. It uses SVG, HTML, and CSS to bring data to life with powerful visualizations.

## Files Involved

### 1. `frontend/src/components/DeadlockDisplay/EnhancedGraphView.tsx`

This component creates an interactive force-directed graph visualization of PostgreSQL deadlocks. It shows processes as nodes and their waiting/blocking relationships as edges.

```typescript
// D3 Force simulation setup
const simulation = d3.forceSimulation<D3Node, D3Link>(nodes)
  .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(100))
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collide', d3.forceCollide().radius(30));
```

## How It Works

### 1. Data Preparation

We convert API data into D3-compatible formats:

```typescript
// Create nodes from processes
const nodes: D3Node[] = vizData.processes.map(process => ({
  id: process.pid,
  pid: process.pid,
  inCycle: Boolean(process.inCycle),
  // other properties...
}));

// Create links from process relationships
const links: D3Link[] = [];
vizData.processes.forEach(process => {
  if (process.blockingPids) {
    process.blockingPids.forEach(blockingPid => {
      links.push({
        source: process.pid,
        target: blockingPid,
        inCycle: process.inCycle
      });
    });
  }
});
```

### 2. Force Simulation

D3's force simulation creates a realistic layout that makes complex relationships easier to understand:

- **Link Force**: Keeps connected nodes at a consistent distance
- **Charge Force**: Makes nodes repel each other
- **Center Force**: Keeps the graph centered
- **Collide Force**: Prevents nodes from overlapping

```typescript
// Create a force simulation
const simulation = d3.forceSimulation<D3Node, D3Link>(nodes)
  .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(100))
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collide', d3.forceCollide().radius(30));
```

### 3. Drawing SVG Elements

We create SVG elements for nodes (processes) and links (relationships):

```typescript
// Draw the links
const linkElements = linkGroup.selectAll('line')
  .data(links)
  .enter()
  .append('line')
  .attr('class', 'link')
  .attr('stroke', d => d.inCycle ? theme.colors.red[6] : theme.colors.gray[6])
  .attr('marker-end', d => d.inCycle ? 'url(#arrowhead-cycle)' : 'url(#arrowhead)');

// Draw the nodes
const nodeElements = nodeGroup.selectAll('circle')
  .data(nodes)
  .enter()
  .append('circle')
  .attr('class', 'node')
  .attr('r', 20)
  .attr('fill', d => d.inCycle ? theme.colors.red[6] : theme.colors.blue[6]);
```

### 4. Interactive Features

We add interactivity with event handlers:

```typescript
// Add zoom behavior
const zoom = d3.zoom<SVGSVGElement, unknown>()
  .scaleExtent([0.2, 5])
  .on('zoom', (event) => {
    g.attr('transform', event.transform);
    setZoomLevel(event.transform.k);
  });

// Make nodes draggable
nodeElements.call(d3.drag<SVGCircleElement, D3Node>()
  .on('start', (event, d) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  })
  .on('drag', (event, d) => {
    d.fx = event.x;
    d.fy = event.y;
  })
  .on('end', (event, d) => {
    if (!event.active) simulation.alphaTarget(0);
  })
);

// Add tooltips
nodeElements.on('mouseover', function(event, d) {
  // Show tooltip with node details
});
```

### 5. Animation

The simulation updates positions on each tick until it reaches an equilibrium:

```typescript
simulation.on('tick', () => {
  // Update link positions
  linkElements
    .attr('x1', d => typeof d.source === 'object' ? d.source.x || 0 : 0)
    .attr('y1', d => typeof d.source === 'object' ? d.source.y || 0 : 0)
    .attr('x2', d => typeof d.target === 'object' ? d.target.x || 0 : 0)
    .attr('y2', d => typeof d.target === 'object' ? d.target.y || 0 : 0);
  
  // Update node positions
  nodeElements
    .attr('cx', d => d.x || 0)
    .attr('cy', d => d.y || 0);
});
```

## Performance Optimizations

### 1. Simulation Cleanup

We store and clean up the simulation to prevent memory leaks:

```typescript
// Store simulation reference
simulationRef.current = simulation;

// Clean up on unmount
useEffect(() => {
  return () => {
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
  };
}, []);
```

### 2. Efficient Rendering

We organize SVG elements in grouped layers for more efficient rendering:

```typescript
// Create organized groups
const linkGroup = g.append('g').attr('class', 'links');
const nodeGroup = g.append('g').attr('class', 'nodes');
const labelGroup = g.append('g').attr('class', 'labels');
```

### 3. Controlled Animation Decay

We control how long the animation runs to balance performance and aesthetics:

```typescript
// Make simulation run a bit then slow down
simulation.alpha(1).restart();
setTimeout(() => {
  if (simulationRef.current) {
    simulationRef.current.alphaTarget(0);
  }
}, 3000);
```

## Visual Enhancements

### 1. Color Coding

We use colors to indicate the status of processes:

- **Blue**: Regular processes
- **Red**: Processes in deadlock cycle
- **Orange**: Critical processes

```typescript
.attr('fill', d => {
  if (d.inCycle) return theme.colors.red[6];
  if (d.critical) return theme.colors.orange[6];
  return theme.colors.blue[6];
})
```

### 2. Tooltips

We add tooltips to show detailed information on hover:

```typescript
// Show tooltip with node information
let tooltipContent = `<div style="font-weight: bold;">Process ${d.pid}</div>`;
if (d.applicationName) {
  tooltipContent += `<div>App: ${d.applicationName}</div>`;
}
if (d.query) {
  tooltipContent += `<div>Query: ${d.query.substring(0, 100)}</div>`;
}
```

### 3. Interactive Highlight

We highlight related elements on hover for better visualization:

```typescript
// Highlight connected links
linkGroup.selectAll('line')
  .attr('stroke-opacity', l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return (sourceId === d.id || targetId === d.id) ? 1 : 0.2;
  })
```

## User Controls

### 1. Zoom Controls

We add explicit zoom controls for better usability:

```typescript
// Handle zoom in
const handleZoomIn = useCallback(() => {
  if (svgRef.current && zoomInstance.current) {
    d3.select(svgRef.current).transition().duration(300)
      .call(zoomInstance.current.scaleBy, 1.3);
  }
}, []);
```

### 2. Export Feature

We provide a way to save the visualization:

```typescript
// Handle SVG export
const handleExportSVG = useCallback(async () => {
  if (!svgRef.current || !eventId) return;
  
  const result = await exportDeadlockSVG(eventId, svgRef.current, {
    preserveTransform: true,
    includeMetadata: true
  });
}, [eventId]);
```

## Common Issues and Solutions

### 1. Simulation Not Rendering

If the simulation doesn't render correctly:

- Ensure container dimensions are available before initializing
- Check that data is properly formatted (especially the nodes and links)
- Make sure simulation is running (initial alpha > 0)

### 2. Poor Performance

If the visualization is slow:

- Reduce the number of forces applied
- Decrease the charge strength
- Limit animation duration with alphaTarget

### 3. Layout Problems

If nodes are positioned poorly:

- Adjust force strength parameters
- Add gravity forces to keep nodes centered
- Add a collide force to prevent overlapping

## Next Steps

To further enhance the visualization:

1. **Filtering**: Allow users to filter by process type or table name
2. **Clustering**: Group related processes together
3. **Timeline**: Add a timeline slider to see how the deadlock evolved
4. **3D View**: Consider a 3D visualization for complex deadlocks

## Resources

- [D3.js Documentation](https://d3js.org/docs/)
- [Force Simulation API](https://d3js.org/d3-force)
- [SVG Documentation](https://developer.mozilla.org/en-US/docs/Web/SVG)