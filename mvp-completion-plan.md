# Dexter MVP Completion Sprint Plan

## Sprint Goal
Complete the remaining 25% of the MVP phase (Phase 1) with emphasis on:
1. Enhanced Event Detail View with comprehensive Sentry data
2. Completed PostgreSQL Deadlock Analyzer
3. Improved LLM integration with context-aware prompts
4. UI polish and keyboard navigation

## 1. Enhanced Event Detail View (40% of sprint effort)

### 1.1. Audit and Enhance Sentry API Data Extraction

**Task:** Comprehensive review of Sentry API to ensure we're extracting all valuable data.

```python
# Sample code for SentryApiClient enhancement
class SentryApiClient:
    # Existing methods...
    
    async def get_extended_event_details(self, organization_slug, project_slug, event_id):
        """
        Get comprehensive event details with additional context data, breadcrumbs, and related events.
        """
        try:
            # Get basic event details first
            event_data = await self.get_event_details(organization_slug, project_slug, event_id)
            
            # Enhance with additional API calls if needed
            if event_data:
                # Get related events for context
                related_events = await self._get_related_events(organization_slug, project_slug, event_data)
                event_data["relatedEvents"] = related_events
                
                # Get user information if available
                if event_data.get("user", {}).get("id"):
                    user_data = await self._get_user_details(organization_slug, event_data["user"]["id"])
                    event_data["userDetails"] = user_data
                
                # Get release information if available
                if event_data.get("release"):
                    release_data = await self._get_release_details(organization_slug, project_slug, event_data["release"])
                    event_data["releaseDetails"] = release_data
            
            return event_data
            
        except Exception as e:
            logger.exception(f"Error fetching extended event details: {e}")
            raise
            
    async def _get_related_events(self, organization_slug, project_slug, event_data):
        """Get events related to this one based on various criteria."""
        # Implementation...
        
    async def _get_user_details(self, organization_slug, user_id):
        """Get extended user details if available."""
        # Implementation...
        
    async def _get_release_details(self, organization_slug, project_slug, release_id):
        """Get extended release information for context."""
        # Implementation...
```

### 1.2. Event Detail View UI Enhancements

**Task:** Expand the EventDetail component to display all available data in an organized, accessible way.

```jsx
// Enhanced EventDetail.jsx additions
// Add these sections to the existing component

// Release Information Section
{eventDetails.releaseDetails && (
  <Paper p="md" withBorder mb="md">
    <Group mb="xs">
      <IconCodeDots size={16} />
      <Text fw={600}>Release Information</Text>
    </Group>
    <Group gap="md">
      <Badge color="blue">{eventDetails.releaseDetails.version}</Badge>
      <Text size="sm">
        Deployed: {format(new Date(eventDetails.releaseDetails.dateCreated), 'PPp')}
      </Text>
      {eventDetails.releaseDetails.url && (
        <Anchor href={eventDetails.releaseDetails.url} target="_blank" size="sm">
          <Group gap={4}>
            <Text>View Commits</Text>
            <IconExternalLink size={14} />
          </Group>
        </Anchor>
      )}
    </Group>
    {eventDetails.releaseDetails.lastCommit && (
      <Code block mt="xs" sx={{ fontSize: '0.85rem' }}>
        {eventDetails.releaseDetails.lastCommit.message}
        {`Author: ${eventDetails.releaseDetails.lastCommit.author}`}
      </Code>
    )}
  </Paper>
)}

// HTTP Request Details Section
{eventDetails.request && (
  <Accordion.Item value="request">
    <Accordion.Control icon={<IconWorld color={theme.colors.cyan[6]} />}>
      <Text fw={600}>HTTP Request</Text>
    </Accordion.Control>
    <Accordion.Panel>
      <Stack gap="md">
        <Group>
          <Badge color={getMethodColor(eventDetails.request.method)}>
            {eventDetails.request.method}
          </Badge>
          <Text size="sm">{eventDetails.request.url}</Text>
        </Group>
        
        {eventDetails.request.headers && (
          <Box>
            <Text fw={600} size="sm" mb="xs">Headers</Text>
            <Code block sx={{ fontSize: '0.85rem' }}>
              {Object.entries(eventDetails.request.headers).map(([key, value]) => (
                <div key={key}>
                  {key}: {value}
                </div>
              ))}
            </Code>
          </Box>
        )}
        
        {eventDetails.request.data && (
          <Box>
            <Text fw={600} size="sm" mb="xs">Request Data</Text>
            <Code block sx={{ fontSize: '0.85rem' }}>
              {typeof eventDetails.request.data === 'object' 
                ? JSON.stringify(eventDetails.request.data, null, 2) 
                : eventDetails.request.data}
            </Code>
          </Box>
        )}
      </Stack>
    </Accordion.Panel>
  </Accordion.Item>
)}

// Enhanced Breadcrumbs Section
{eventDetails.breadcrumbs && eventDetails.breadcrumbs.length > 0 && (
  <Accordion.Item value="breadcrumbs">
    <Accordion.Control icon={<IconRoute color={theme.colors.yellow[6]} />}>
      <Text fw={600}>Breadcrumbs</Text>
    </Accordion.Control>
    <Accordion.Panel>
      <Timeline active={eventDetails.breadcrumbs.length - 1}>
        {eventDetails.breadcrumbs.map((breadcrumb, index) => (
          <Timeline.Item 
            key={index} 
            title={breadcrumb.category || breadcrumb.type}
            bullet={<IconCircleDot size={14} />}
            color={getBreadcrumbColor(breadcrumb.level)}
          >
            <Text size="sm">{breadcrumb.message}</Text>
            <Text size="xs" c="dimmed">
              {format(new Date(breadcrumb.timestamp), 'HH:mm:ss.SSS')}
            </Text>
            {breadcrumb.data && Object.keys(breadcrumb.data).length > 0 && (
              <Collapse in={expandedBreadcrumbs.includes(index)}>
                <Code block mt="xs" sx={{ fontSize: '0.75rem' }}>
                  {JSON.stringify(breadcrumb.data, null, 2)}
                </Code>
              </Collapse>
            )}
            {breadcrumb.data && Object.keys(breadcrumb.data).length > 0 && (
              <Button 
                variant="subtle" 
                size="xs" 
                compact
                mt={4}
                onClick={() => toggleBreadcrumb(index)}
                rightSection={
                  expandedBreadcrumbs.includes(index) 
                    ? <IconChevronUp size={14} /> 
                    : <IconChevronDown size={14} />
                }
              >
                {expandedBreadcrumbs.includes(index) ? 'Hide' : 'Show'} Data
              </Button>
            )}
          </Timeline.Item>
        ))}
      </Timeline>
    </Accordion.Panel>
  </Accordion.Item>
)}

// Related Events Section
{eventDetails.relatedEvents && eventDetails.relatedEvents.length > 0 && (
  <Paper p="md" withBorder mb="md">
    <Text fw={600} mb="xs">Related Events</Text>
    <ScrollArea h={200}>
      <Stack>
        {eventDetails.relatedEvents.map((event, index) => (
          <Paper key={index} p="xs" withBorder>
            <Group position="apart">
              <Group>
                <ThemeIcon color={event.level} size="sm" radius="md">
                  <IconBug size={14} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={500} lineClamp={1}>{event.title}</Text>
                  <Text size="xs" c="dimmed">
                    {format(new Date(event.dateCreated), 'PPp')}
                  </Text>
                </div>
              </Group>
              <Button 
                variant="subtle" 
                size="xs"
                onClick={() => handleViewRelatedEvent(event.id)}
              >
                View
              </Button>
            </Group>
          </Paper>
        ))}
      </Stack>
    </ScrollArea>
  </Paper>
)}
```

### 1.3. Data Extraction Utilities

**Task:** Create utilities to extract, format, and analyze event data more effectively.

```jsx
// src/utils/sentryDataExtractors.js

/**
 * Advanced utilities for extracting and formatting Sentry data
 */

/**
 * Extract full exception chain from event data
 */
export function extractExceptionChain(eventData) {
  const exceptionValues = [];
  
  // Check direct exception field
  if (eventData.exception?.values) {
    exceptionValues.push(...eventData.exception.values);
  }
  
  // Check in entries
  if (eventData.entries) {
    for (const entry of eventData.entries) {
      if (entry.type === 'exception' && entry.data?.values) {
        exceptionValues.push(...entry.data.values);
      }
    }
  }
  
  // Process and link exceptions as a chain
  return exceptionValues.map((exception, index) => {
    return {
      ...exception,
      isRootCause: index === exceptionValues.length - 1,
      isFirstException: index === 0
    };
  });
}

/**
 * Extract and format breadcrumbs with timestamps
 */
export function extractBreadcrumbs(eventData) {
  const breadcrumbs = [];
  
  // Check direct breadcrumbs field
  if (eventData.breadcrumbs) {
    breadcrumbs.push(...eventData.breadcrumbs);
  }
  
  // Check in entries
  if (eventData.entries) {
    for (const entry of eventData.entries) {
      if (entry.type === 'breadcrumbs' && entry.data?.values) {
        breadcrumbs.push(...entry.data.values);
      }
    }
  }
  
  // Sort breadcrumbs by timestamp
  return breadcrumbs.sort((a, b) => {
    if (!a.timestamp) return -1;
    if (!b.timestamp) return 1;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
}

/**
 * Extract all context data (browser, OS, device, custom) from event data
 */
export function extractAllContexts(eventData) {
  const contexts = { ...eventData.contexts };
  
  // Extract request data if available
  if (eventData.request) {
    contexts.request = eventData.request;
  }
  
  // Extract user data if available
  if (eventData.user) {
    contexts.user = eventData.user;
  }
  
  // Extract environment data
  if (eventData.environment) {
    contexts.environment = { name: eventData.environment };
  }
  
  // Extract SDK data
  if (eventData.sdk) {
    contexts.sdk = eventData.sdk;
  }
  
  return contexts;
}

/**
 * Analyze stack frames to identify potential issues
 */
export function analyzeStackFrames(frames) {
  const applicationFrames = frames.filter(frame => frame.inApp);
  const libraryFrames = frames.filter(frame => !frame.inApp);
  
  // Identify interesting frames for debugging
  const suspiciousFrames = frames.filter(frame => {
    // Look for common error patterns
    const code = frame.context_line || '';
    return (
      code.includes('undefined') ||
      code.includes('null') ||
      code.includes('try') ||
      code.includes('catch') ||
      code.includes('throw')
    );
  });
  
  return {
    applicationFrames,
    libraryFrames,
    suspiciousFrames,
    mostRelevantFrame: applicationFrames[0] || frames[0]
  };
}
```

## 2. PostgreSQL Deadlock Analyzer (25% of sprint effort)

### 2.1. Complete Enhanced Deadlock Parser

**Task:** Enhance the deadlock parser to extract all available information from PostgreSQL deadlock errors.

```python
# Add these parser improvements to enhanced_deadlock_parser.py

def parse_postgresql_deadlock(event_data: Dict[str, Any]) -> Optional[DeadlockInfo]:
    # Existing implementation...
    
    # Enhanced transaction details extraction
    def _extract_transaction_details(process_data, message):
        """Extract detailed transaction info including queries, tables, isolation level."""
        # Current implementation...
        
        # Add transaction isolation level detection
        isolation_match = re.search(r'isolation level: (\w+)', message)
        if isolation_match:
            transaction.isolation_level = isolation_match.group(1)
        
        # Add transaction start time approximation
        time_match = re.search(r'process\s+\d+\s+started\s+at\s+([\d-]+ [\d:\.]+)', message)
        if time_match:
            try:
                transaction.start_time = datetime.fromisoformat(time_match.group(1).replace(' ', 'T'))
            except (ValueError, TypeError):
                pass
        
        # Extract query parameters if available
        params_match = re.search(r'parameters:\s*\$1\s*=\s*([^,]+)(?:,\s*\$(\d+)\s*=\s*([^,]+))*', message)
        if params_match:
            transaction.query_params = [p.strip() for p in params_match.groups() if p]
    
    # Enhanced relation analysis
    def _analyze_involved_relations(deadlock_info):
        """Identify the table relationships in the deadlock."""
        relations = set()
        for tx in deadlock_info.transactions.values():
            relations.update(tx.tables_accessed)
        
        # Build relation dependency graph
        graph = nx.DiGraph()
        
        for rel in relations:
            graph.add_node(rel)
        
        for cycle in deadlock_info.cycles:
            for i in range(len(cycle.processes)):
                pid1 = cycle.processes[i]
                pid2 = cycle.processes[(i + 1) % len(cycle.processes)]
                
                tx1 = deadlock_info.transactions.get(pid1)
                tx2 = deadlock_info.transactions.get(pid2)
                
                if tx1 and tx2:
                    for rel1 in tx1.tables_accessed:
                        for rel2 in tx2.tables_accessed:
                            if rel1 != rel2:
                                graph.add_edge(rel1, rel2)
        
        # Identify problematic relationship patterns
        deadlock_info.relation_analysis = {
            'tables': list(relations),
            'access_pattern': nx.cycle_basis(graph),
            'centrality': {node: score for node, score in nx.betweenness_centrality(graph).items()}
        }
    
    # Add these calls to the main parser function
    # ...after parsing the raw data and before returning the DeadlockInfo
    _analyze_involved_relations(deadlock_info)
    
    return deadlock_info
```

### 2.2. Enhance Deadlock Visualization

**Task:** Complete the frontend visualization with interactive graph support.

```jsx
// src/components/DeadlockDisplay/EnhancedGraphView.jsx

import React, { useEffect, useRef } from 'react';
import { useMantineTheme, Paper, Text, Skeleton, Center, Stack } from '@mantine/core';
import * as d3 from 'd3';

const EnhancedGraphView = ({ data, isLoading }) => {
  const svgRef = useRef(null);
  const theme = useMantineTheme();
  
  useEffect(() => {
    if (isLoading || !data || !data.nodes || !data.edges || !svgRef.current) {
      return;
    }
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    const width = 600;
    const height = 400;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");
    
    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));
    
    // Create arrow marker for directed edges
    svg.append("defs").selectAll("marker")
      .data(["standard", "cycle"])
      .enter().append("marker")
      .attr("id", d => d)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", d => d === "cycle" ? theme.colors.red[6] : theme.colors.gray[6])
      .attr("d", "M0,-5L10,0L0,5");
    
    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", d => d.inCycle ? theme.colors.red[6] : theme.colors.gray[6])
      .attr("stroke-width", d => d.inCycle ? 3 : 1.5)
      .attr("stroke-dasharray", d => d.label === "accesses" ? "5,5" : "none")
      .attr("marker-end", d => `url(#${d.inCycle ? "cycle" : "standard"})`);
    
    // Create node groups
    const node = svg.append("g")
      .selectAll(".node")
      .data(data.nodes)
      .enter().append("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add circles to nodes
    node.append("circle")
      .attr("r", d => d.type === "process" ? 25 : 20)
      .attr("fill", d => {
        if (d.inCycle) return theme.colors.red[1];
        return d.type === "process" ? theme.colors.blue[1] : theme.colors.green[1];
      })
      .attr("stroke", d => {
        if (d.inCycle) return theme.colors.red[6];
        return d.type === "process" ? theme.colors.blue[6] : theme.colors.green[6];
      })
      .attr("stroke-width", 2);
    
    // Add text to nodes
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .text(d => {
        const label = d.label.replace(/^Process /, "P");
        return label.length > 10 ? label.substring(0, 8) + "..." : label;
      })
      .attr("font-size", "12px")
      .attr("fill", theme.colors.dark[9]);
    
    // Add tooltips
    node.append("title")
      .text(d => {
        if (d.type === "process") {
          return `Process ${d.id.split('_')[1]}\nLocks Held: ${d.locks_held.length}\nLocks Waiting: ${d.locks_waiting.length}`;
        } else {
          return `Table: ${d.label}`;
        }
      });
    
    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Return cleanup function
    return () => {
      simulation.stop();
    };
  }, [data, isLoading, theme]);
  
  if (isLoading) {
    return (
      <Skeleton height={400} radius="md" />
    );
  }
  
  if (!data || !data.nodes || !data.edges) {
    return (
      <Center style={{ height: 400 }}>
        <Stack align="center">
          <Text c="dimmed">No visualization data available</Text>
        </Stack>
      </Center>
    );
  }
  
  return (
    <Paper withBorder p="md" style={{ overflow: 'hidden' }}>
      <Text fw={500} size="sm" mb="sm">Deadlock Visualization</Text>
      <svg ref={svgRef} style={{ width: '100%', height: 400 }} />
    </Paper>
  );
};

export default EnhancedGraphView;
```

## 3. LLM Integration Improvements (20% of sprint effort)

### 3.1. Context-Aware Prompting

**Task:** Implement specialized prompt templates and context extraction for different error types.

```python
# Enhance the LLM service with context-aware prompting
# backend/app/services/llm_service.py

ERROR_TYPE_TEMPLATES = {
    "django.db.utils.IntegrityError": "postgresql_integrity_error",
    "psycopg2.errors.DeadlockDetected": "postgresql_deadlock",
    "TypeError": "python_type_error",
    "ReferenceError": "javascript_reference_error",
    "React": "react_error",
    "Django": "django_error",
    "Spring": "spring_error",
    "Default": "general_error"
}

class EnhancedLLMService:
    # Existing implementation...
    
    def _select_template(self, error_context):
        """Select the appropriate template based on error context."""
        # Try to determine the error type from context
        error_type = error_context.get("error_type", "")
        
        # Check for framework-specific errors
        for key, template_name in ERROR_TYPE_TEMPLATES.items():
            if key in error_type or key in str(error_context.get("stack_trace", "")):
                return self.templates.get(template_name, self.templates["general_error_developer"])
        
        # If no specific template, use the default
        return self.templates["general_error_developer"]
    
    def _extract_framework_specific_context(self, event_data):
        """Extract framework-specific context from event data."""
        # Extract tags that might indicate framework
        framework = None
        tags = event_data.get("tags", [])
        for tag in tags:
            if tag.get("key") == "framework" or tag.get("key") == "runtime.name":
                framework = tag.get("value", "").lower()
                break
        
        # If no framework found in tags, try to determine from other fields
        if not framework:
            exception_values = (event_data.get("exception", {}).get("values", []) or 
                              [v for e in event_data.get("entries", []) 
                               if e.get("type") == "exception" 
                               for v in e.get("data", {}).get("values", [])])
            
            for exception in exception_values:
                exc_type = exception.get("type", "")
                exc_value = exception.get("value", "")
                
                # Check for familiar patterns
                if "react" in exc_type.lower() or "react" in exc_value.lower():
                    framework = "react"
                elif "django" in exc_type.lower() or "django" in exc_value.lower():
                    framework = "django"
                elif "spring" in exc_type.lower() or "spring" in exc_value.lower():
                    framework = "spring"
                # Add more framework detection as needed
        
        # Extract framework-specific context
        context = {}
        if framework == "react":
            context = self._extract_react_context(event_data)
        elif framework == "django":
            context = self._extract_django_context(event_data)
        elif framework == "spring":
            context = self._extract_spring_context(event_data)
        
        return framework, context
    
    def _extract_react_context(self, event_data):
        """Extract React-specific context from event data."""
        context = {"framework": "react"}
        
        # Try to extract component information
        frames = []
        for exc in event_data.get("exception", {}).get("values", []):
            if exc.get("stacktrace", {}).get("frames"):
                frames.extend(exc.get("stacktrace", {}).get("frames", []))
        
        # Look for React components in stack frames
        react_frames = []
        component_name = None
        lifecycle_method = None
        
        for frame in frames:
            func = frame.get("function", "")
            if "react" in func.lower() or "component" in func.lower():
                react_frames.append(frame)
            
            # Try to identify component name
            if re.match(r'[A-Z][a-zA-Z]*\.(render|componentDid|shouldComponent|getDerived)', func):
                parts = func.split('.')
                if len(parts) >= 2:
                    component_name = parts[0]
                    lifecycle_method = parts[1]
        
        context["component_name"] = component_name
        context["lifecycle_method"] = lifecycle_method
        context["react_frames"] = react_frames
        
        return context
    
    def _extract_django_context(self, event_data):
        """Extract Django-specific context from event data."""
        # Implementation for Django-specific context
        return {"framework": "django"}
    
    def _extract_spring_context(self, event_data):
        """Extract Spring-specific context from event data."""
        # Implementation for Spring-specific context
        return {"framework": "spring"}
```

### 3.2. Structured LLM Output

**Task:** Implement structured output formats for different error types to ensure consistent UI rendering.

```python
# backend/app/services/llm_service.py - additional methods

def _structure_json_response(self, response, error_type):
    """Try to parse LLM response as structured JSON based on error type."""
    try:
        # First try to parse the response as JSON
        data = json.loads(response)
        
        # Ensure it has the required fields
        if not data.get("explanation"):
            data["explanation"] = response
        
        # Add default structure based on error type
        if error_type == "postgresql_deadlock":
            if not data.get("deadlock_info"):
                data["deadlock_info"] = {
                    "processes": [],
                    "tables": [],
                    "recommended_fix": data.get("recommended_fix", "")
                }
        elif error_type == "react_error":
            if not data.get("component_info"):
                data["component_info"] = {
                    "component": "",
                    "lifecycle_method": "",
                    "props_issue": False
                }
        
        return data
    except json.JSONDecodeError:
        # If not valid JSON, create structure based on full text
        return self._create_structured_response(response, error_type)

def _create_structured_response(self, text, error_type):
    """Create structured response from raw text based on error type."""
    # Basic structure common to all types
    structured = {
        "explanation": text,
        "format": "text",
        "error_type": error_type
    }
    
    # Add confidence level placeholder
    structured["confidence"] = 0.7
    
    # Look for fix suggestions
    fix_match = re.search(r'(?:potential fix(?:es)?|solution(?:s)?|recommendation(?:s)?|you can try|to fix|fix this):(.*?)(?:\n\n|$)', text, re.IGNORECASE | re.DOTALL)
    if fix_match:
        structured["fix_suggestions"] = [fix.strip() for fix in fix_match.group(1).split('\n') if fix.strip()]
    
    return structured
```

### 3.3. Frontend Error Explanation Improvements

**Task:** Enhance the ExplainError component to handle structured explanations.

```jsx
// src/components/ExplainError/ExplainError.jsx

// Add this new structured explanation renderer
const StructuredExplanation = ({ data, error_type }) => {
  const theme = useMantineTheme();
  
  // Default rendering for any explanation
  const renderDefaultExplanation = () => (
    <Box>
      <Text mb="sm">{data.explanation}</Text>
      
      {data.fix_suggestions && data.fix_suggestions.length > 0 && (
        <>
          <Text fw={600} mt="md" mb="xs">Suggested Fixes:</Text>
          <List size="sm">
            {data.fix_suggestions.map((fix, index) => (
              <List.Item key={index}>{fix}</List.Item>
            ))}
          </List>
        </>
      )}
      
      {data.confidence && (
        <Group position="right" mt="md">
          <Badge 
            color={data.confidence > 0.7 ? "green" : "yellow"}
            variant="light"
          >
            Confidence: {Math.round(data.confidence * 100)}%
          </Badge>
        </Group>
      )}
    </Box>
  );
  
  // Specialized rendering for PostgreSQL deadlocks
  const renderDeadlockExplanation = () => (
    <Box>
      <Text mb="sm">{data.explanation}</Text>
      
      {data.deadlock_info && (
        <Paper withBorder p="sm" bg={theme.colors.gray[0]} mt="md">
          <Text fw={600} size="sm" mb="xs">Deadlock Analysis</Text>
          
          <Group mb="md">
            {data.deadlock_info.tables?.map((table, i) => (
              <Badge key={i} color="blue" variant="outline">{table}</Badge>
            ))}
          </Group>
          
          {data.deadlock_info.recommended_fix && (
            <>
              <Text fw={600} size="sm" mt="md" mb="xs">Recommended Fix:</Text>
              <Text size="sm">{data.deadlock_info.recommended_fix}</Text>
            </>
          )}
        </Paper>
      )}
      
      {data.confidence && (
        <Group position="right" mt="md">
          <Badge 
            color={data.confidence > 0.7 ? "green" : "yellow"}
            variant="light"
          >
            Confidence: {Math.round(data.confidence * 100)}%
          </Badge>
        </Group>
      )}
    </Box>
  );
  
  // Specialized rendering for React errors
  const renderReactExplanation = () => (
    <Box>
      <Text mb="sm">{data.explanation}</Text>
      
      {data.component_info && (
        <Paper withBorder p="sm" bg={theme.colors.blue[0]} mt="md">
          <Text fw={600} size="sm" mb="xs">React Component Analysis</Text>
          
          {data.component_info.component && (
            <Group mb="xs">
              <Text fw={500} size="sm">Component:</Text>
              <Text size="sm">{data.component_info.component}</Text>
            </Group>
          )}
          
          {data.component_info.lifecycle_method && (
            <Group mb="xs">
              <Text fw={500} size="sm">Lifecycle Method:</Text>
              <Text size="sm">{data.component_info.lifecycle_method}</Text>
            </Group>
          )}
        </Paper>
      )}
      
      {data.fix_suggestions && data.fix_suggestions.length > 0 && (
        <>
          <Text fw={600} mt="md" mb="xs">Suggested Fixes:</Text>
          <List size="sm">
            {data.fix_suggestions.map((fix, index) => (
              <List.Item key={index}>{fix}</List.Item>
            ))}
          </List>
        </>
      )}
    </Box>
  );
  
  // Choose the appropriate renderer based on error type
  switch(error_type) {
    case 'postgresql_deadlock':
      return renderDeadlockExplanation();
    case 'react_error':
      return renderReactExplanation();
    default:
      return renderDefaultExplanation();
  }
};

// Integrate this into the existing ExplainError component
// Inside the success block of ExplainError:
{explainMutation.isSuccess && (
  <Box mt="md">
    <Paper 
      withBorder
      p="md" 
      radius="md"
      sx={{
        backgroundColor: theme.white,
        borderColor: theme.colors.gray[3],
      }}
    >
      <Stack gap="md">
        <Group gap="xs">
          <ThemeIcon 
            size="sm" 
            radius="xl" 
            color="grape"
            variant="light"
          >
            <IconBulb size={12} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            AI Explanation of Error: {title}
          </Text>
        </Group>
        
        {explainMutation.data?.format === 'json' ? (
          <StructuredExplanation 
            data={explainMutation.data} 
            error_type={explainMutation.data?.error_type || 'general'}
          />
        ) : (
          <Text size="sm" sx={{ whiteSpace: 'pre-wrap' }}>
            {explainMutation.data?.explanation || 
             "No explanation was provided by the AI. This might be due to insufficient information about the error."}
          </Text>
        )}
        
        {explainMutation.data?.error && (
          <Alert 
            color="yellow" 
            title="AI Service Warning" 
            icon={<IconServer size={16} />}
          >
            <Text size="sm">{explainMutation.data.error}</Text>
          </Alert>
        )}
        
        <Group position="apart" mt="xs">
          <Text size="xs" c="dimmed">
            Powered by local Ollama LLM
          </Text>
          {explainMutation.data?.model_used && (
            <Badge size="xs" color="gray" variant="outline">
              {explainMutation.data.model_used}
            </Badge>
          )}
        </Group>
      </Stack>
    </Paper>
    
    <Group position="right" mt="xs">
      <Button 
        size="xs" 
        variant="subtle" 
        color="gray"
        leftSection={<IconRobot size={14} />}
        onClick={handleRetry}
      >
        Regenerate
      </Button>
    </Group>
  </Box>
)}
```

## 4. UI Polish and Keyboard Navigation (15% of sprint effort)

### 4.1. Keyboard Navigation Framework

**Task:** Implement a comprehensive keyboard shortcut system.

```jsx
// src/hooks/useKeyboardNav.js

import { useEffect, useCallback } from 'react';
import { useHotkeys } from '@mantine/hooks';

/**
 * Custom hook for keyboard navigation throughout the application
 */
const useKeyboardNav = ({ 
  onPreviousItem,
  onNextItem,
  onExpandItem,
  onCollapseItem,
  onActionPrimary,
  onActionSecondary,
  onSearch,
  enabled = true
}) => {
  // Setup mantine hotkeys
  useHotkeys([
    ['j', onNextItem, { enabled }],
    ['k', onPreviousItem, { enabled }],
    ['ArrowDown', onNextItem, { enabled }],
    ['ArrowUp', onPreviousItem, { enabled }],
    ['ArrowRight, l', onExpandItem, { enabled }],
    ['ArrowLeft, h', onCollapseItem, { enabled }],
    ['Enter', onActionPrimary, { enabled }],
    ['Space', onActionPrimary, { enabled }],
    ['e', onActionSecondary, { enabled }],
    ['/', onSearch, { enabled }],
  ]);
  
  // Additional global handlers for common actions like ESC
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e) => {
      // Global escape handler
      if (e.key === 'Escape') {
        // Handle escape - close modals, panels, etc.
      }
      
      // Add other global handlers as needed
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
  
  // Return state and helper functions
  return {
    isEnabled: enabled,
  };
};

export default useKeyboardNav;
```

### 4.2. Add Keyboard Shortcuts to Main Components

**Task:** Integrate keyboard shortcuts into the main application components.

```jsx
// src/pages/DashboardPage.jsx - add keyboard shortcut support

import { useRef, useState } from 'react';
import useKeyboardNav from '../hooks/useKeyboardNav';
import useAppStore from '../store/appStore';

function DashboardPage() {
  // Existing implementation...
  
  const eventTableRef = useRef(null);
  const eventDetailRef = useRef(null);
  const [keyboardFocus, setKeyboardFocus] = useState('table');
  
  const { selectedIssueId, setSelectedIssue } = useAppStore();
  
  // Keyboard navigation handlers
  const handleNextIssue = () => {
    if (keyboardFocus === 'table' && eventTableRef.current) {
      eventTableRef.current.focusNextIssue();
    }
  };
  
  const handlePrevIssue = () => {
    if (keyboardFocus === 'table' && eventTableRef.current) {
      eventTableRef.current.focusPrevIssue();
    }
  };
  
  const handleExpandIssue = () => {
    if (keyboardFocus === 'table' && eventTableRef.current) {
      const issueId = eventTableRef.current.getFocusedIssueId();
      if (issueId) {
        setSelectedIssue(issueId);
        setKeyboardFocus('detail');
      }
    }
  };
  
  const handleCollapseDetail = () => {
    if (keyboardFocus === 'detail') {
      setKeyboardFocus('table');
    }
  };
  
  const handleSearch = () => {
    // Focus search input
    const searchInput = document.querySelector('#issue-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  };
  
  // Use the keyboard navigation hook
  useKeyboardNav({
    onNextItem: handleNextIssue,
    onPreviousItem: handlePrevIssue,
    onExpandItem: handleExpandIssue,
    onCollapseItem: handleCollapseDetail,
    onSearch: handleSearch,
    enabled: true
  });
  
  // Modify the return JSX to include refs and keyboard focus indicators
  return (
    <Box>
      {/* Existing code... */}
      
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <ErrorBoundary>
            <Paper 
              withBorder 
              p="md" 
              shadow="xs" 
              radius="md"
              sx={{
                overflow: 'hidden',
                height: isMobile ? 'auto' : 'calc(100vh - 180px)',
                display: 'flex',
                flexDirection: 'column',
                // Add highlight when keyboard focused
                borderColor: keyboardFocus === 'table' ? theme.colors.blue[5] : undefined,
                borderWidth: keyboardFocus === 'table' ? '2px' : '1px'
              }}
            >
              {/* Add this to show keyboard shortcuts are active */}
              {keyboardFocus === 'table' && (
                <Badge 
                  size="sm" 
                  variant="outline" 
                  color="blue"
                  sx={{ position: 'absolute', top: '10px', right: '10px' }}
                >
                  J/K to navigate
                </Badge>
              )}
              
              <Flex gap="xs" align="center" mb="sm">
                <Title order={4}>Issues</Title>
                <Text size="sm" c="dimmed">
                  Select an issue to view details
                </Text>
              </Flex>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                }}
              >
                <EventTable 
                  ref={eventTableRef}
                  onFocus={() => setKeyboardFocus('table')}
                />
              </Box>
            </Paper>
          </ErrorBoundary>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 5 }}>
          <ErrorBoundary>
            <Paper 
              withBorder 
              p="md" 
              shadow="xs" 
              radius="md" 
              sx={{ 
                height: isMobile ? 'auto' : 'calc(100vh - 180px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                // Add highlight when keyboard focused
                borderColor: keyboardFocus === 'detail' ? theme.colors.blue[5] : undefined,
                borderWidth: keyboardFocus === 'detail' ? '2px' : '1px'
              }}
            >
              {/* Add this to show keyboard shortcuts are active */}
              {keyboardFocus === 'detail' && selectedIssueId && (
                <Badge 
                  size="sm" 
                  variant="outline" 
                  color="blue"
                  sx={{ position: 'absolute', top: '10px', right: '10px' }}
                >
                  ESC to return
                </Badge>
              )}
              
              <Title order={4} mb="sm">Event Details</Title>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                }}
              >
                <EventDetail 
                  ref={eventDetailRef}
                  onFocus={() => setKeyboardFocus('detail')}
                />
              </Box>
            </Paper>
          </ErrorBoundary>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

export default DashboardPage;
```

### 4.3. Add Keyboard Help Modal

**Task:** Create a keyboard shortcut help modal to assist users.

```jsx
// src/components/UI/KeyboardShortcutsHelp.jsx

import React from 'react';
import { Modal, Table, Text, Group, Badge, UnstyledButton, useMantineTheme } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';

/**
 * Keyboard shortcuts help modal component
 */
const KeyboardShortcutsHelp = ({ opened, onClose }) => {
  const theme = useMantineTheme();
  
  // Use ESC to close the modal
  useHotkeys([
    ['escape', onClose],
  ]);
  
  const shortcuts = [
    { key: 'j', description: 'Navigate to next issue' },
    { key: 'k', description: 'Navigate to previous issue' },
    { key: 'Enter', description: 'View selected issue details' },
    { key: 'Esc', description: 'Return to issue list / Close modal' },
    { key: '/', description: 'Focus search box' },
    { key: 'r', description: 'Resolve selected issue' },
    { key: 'i', description: 'Ignore selected issue' },
    { key: 'e', description: 'Explain with AI' },
    { key: 'c', description: 'Copy error details' },
    { key: '?', description: 'Show this help dialog' },
  ];
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Keyboard Shortcuts"
      centered
      size="md"
    >
      <Table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {shortcuts.map((shortcut, index) => (
            <tr key={index}>
              <td>
                <Badge 
                  variant="light" 
                  color={shortcut.key === '?' ? 'grape' : 'blue'}
                  size="lg"
                  px="sm"
                >
                  {shortcut.key}
                </Badge>
              </td>
              <td>
                <Text>{shortcut.description}</Text>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      <Text size="sm" c="dimmed" mt="lg">
        Press ESC to close this dialog
      </Text>
    </Modal>
  );
};

/**
 * Keyboard shortcuts help toggle button
 */
export const KeyboardShortcutsButton = ({ size = 'sm' }) => {
  const [opened, setOpened] = React.useState(false);
  
  // Show help when ? is pressed
  useHotkeys([
    ['shift+?', () => setOpened(true)],
  ]);
  
  return (
    <>
      <UnstyledButton
        onClick={() => setOpened(true)}
        aria-label="Keyboard shortcuts"
        sx={theme => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size === 'sm' ? 28 : 34,
          height: size === 'sm' ? 28 : 34,
          borderRadius: theme.radius.sm,
          color: theme.colors.gray[6],
          '&:hover': {
            backgroundColor: theme.colors.gray[0],
            color: theme.colors.gray[9],
          }
        })}
      >
        <Text size={size} fw={700}>?</Text>
      </UnstyledButton>
      
      <KeyboardShortcutsHelp 
        opened={opened} 
        onClose={() => setOpened(false)} 
      />
    </>
  );
};

export default KeyboardShortcutsHelp;
```

## Sprint Plan Timeline

### Week 1: Backend Enhancements
- **Days 1-2:** Enhance Sentry API client to extract all available data
- **Days 3-4:** Complete the PostgreSQL deadlock parser enhancements
- **Day 5:** Implement context-aware prompt templates in LLM service

### Week 2: Frontend Data Visualization
- **Days 1-2:** Enhance Event Detail View to display all available data
- **Days 3-4:** Implement interactive deadlock visualization with D3.js
- **Day 5:** Create data extraction utilities for frontend

### Week 3: AI Integration & Visualization Refinement
- **Days 1-2:** Implement structured LLM output for different error types
- **Days 3-4:** Enhance the ExplainError component for structured explanations
- **Day 5:** Fine-tune visualizations and error handling

### Week 4: UI Polish & Final Integration
- **Days 1-2:** Implement keyboard navigation framework
- **Days 3-4:** Add keyboard shortcuts to main components
- **Day 5:** Final testing, documentation, and bug fixes

## Testing Approach

1. **Unit Tests:** Create tests for critical components:
   - Deadlock parser
   - LLM service
   - Data extractors

2. **Integration Tests:** 
   - End-to-end flow from Sentry data to visualization
   - Error handling across components

3. **Manual Testing:**
   - Test with real Sentry error data
   - Verify deadlock visualization accuracy
   - Test AI explanations with different error types

## Success Criteria

1. **Comprehensive Event Detail View:** All Sentry data is properly displayed
2. **Working Deadlock Visualization:** Interactive graph showing processes and relationships
3. **Context-Aware AI:** Explanations tailored to error types
4. **Keyboard Navigation:** Full keyboard control of the application
5. **Polished UI:** No console warnings or errors

## Summary

This sprint plan provides a detailed roadmap to complete the Dexter MVP, with special focus on enhancing the Event Detail View to maximize data extraction from Sentry. The plan balances effort across backend enhancements, frontend visualization, AI integration, and UI polish to deliver a high-quality product within the sprint timeframe.
