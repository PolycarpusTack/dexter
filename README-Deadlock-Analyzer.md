# PostgreSQL Deadlock Analyzer for Dexter

This document details the implementation of the enhanced PostgreSQL Deadlock Analyzer feature for Dexter.

## Overview

The PostgreSQL Deadlock Analyzer is a specialized component that parses PostgreSQL deadlock error messages from Sentry events, visualizes the deadlock graph, and provides actionable recommendations to resolve and prevent deadlocks.

## Key Features

### Backend Components

1. **Enhanced Deadlock Parser**
   - Robust regex pattern matching with caching for performance
   - Graph-based cycle detection and analysis using NetworkX
   - Detailed transaction and lock information extraction
   - Query fingerprinting for identifying similar queries
   - PII redaction from SQL queries
   - Lock compatibility matrix for analyzing conflicts
   - Severity scoring to prioritize deadlocks
   - Comprehensive error handling with context

2. **API Endpoints**
   - `GET /analyze-deadlock/{event_id}` - Main analysis endpoint
   - `GET /lock-compatibility-matrix` - Reference for lock compatibility
   - `GET /deadlock-history` - Historical deadlock data (placeholder for future implementation)

### Frontend Components

1. **Enhanced Deadlock Display**
   - Integration with the enhanced backend parser
   - Toggleable view between standard and enhanced analysis
   - Metadata display showing analysis details

2. **Interactive Graph Visualization**
   - D3.js-powered visualization with interactive features
   - Multiple layout options (force-directed, circular, hierarchical)
   - Zoom, pan, and export capabilities
   - Visual highlighting of deadlock cycles
   - Detailed tooltips with comprehensive information
   - Options to filter and customize the visualization

3. **Lock Information Display**
   - Tabular view of locks and processes
   - Transaction query display
   - Resource contention analysis

4. **Recommendation Panel**
   - Context-aware recommendations based on detected patterns
   - Best practice accordion with PostgreSQL-specific advice
   - Example code patterns for resolving deadlocks
   - Copyable recommendations for sharing

## Implementation Details

### Enhanced Deadlock Parser

The enhanced parser (`enhanced_deadlock_parser.py`) includes several improvements over the original implementation:

1. **Structured Models**
   - `LockInfo` - Lock details with compatibility checking
   - `Transaction` - Process information with query fingerprinting
   - `QueryFingerprint` - Hash-based identification of similar queries
   - `DeadlockCycle` - Cycle representation with severity scoring
   - `DeadlockInfo` - Complete deadlock representation

2. **Lock Compatibility Matrix**
   - Accurate modeling of PostgreSQL lock types
   - Conflict detection between different lock modes

3. **Performance Optimizations**
   - Regex caching using `functools.lru_cache`
   - Efficient graph algorithms for cycle detection

4. **Security Features**
   - PII redaction from SQL queries
   - Safe error handling and logging

### Enhanced Visualization

The enhanced visualization (`EnhancedGraphView.jsx`) provides:

1. **Advanced Rendering**
   - Gradient fills and styling for nodes
   - Improved edge styling and animations
   - Highlighting for deadlock cycles

2. **Interactive Features**
   - Zoom and pan controls
   - Physics simulation with adjustable parameters
   - Multiple layout options

3. **Customization Options**
   - Show/hide tables
   - Focus on deadlock cycle only
   - Adjustable force strength

4. **Enhanced Tooltips**
   - Detailed process information
   - Query display with syntax highlighting
   - Lock details

## Usage

### API Endpoints

```
GET /api/v1/enhanced-analyzers/analyze-deadlock/{event_id}
GET /api/v1/enhanced-analyzers/lock-compatibility-matrix
GET /api/v1/enhanced-analyzers/deadlock-history?days={days}
```

### Frontend Components

```jsx
// Import the enhanced components
import EnhancedDeadlockDisplay from './components/DeadlockDisplay/EnhancedDeadlockDisplay';

// Use in your application
<EnhancedDeadlockDisplay eventId={eventId} eventDetails={eventDetails} />
```

## Installation

1. Copy the backend files to their respective directories:
   - `enhanced_deadlock_parser.py` to `backend/app/utils/`
   - `enhanced_analyzers.py` to `backend/app/routers/`

2. Add the new router to `main.py`:
   ```python
   from app.routers import enhanced_analyzers
   
   # Add the router with a prefix
   app.include_router(enhanced_analyzers.router, prefix=API_PREFIX, tags=["Enhanced Analyzers"])
   ```

3. Copy the frontend files to their respective directories:
   - `EnhancedGraphView.jsx` to `frontend/src/components/DeadlockDisplay/`
   - `EnhancedDeadlockDisplay.jsx` to `frontend/src/components/DeadlockDisplay/`
   - `enhancedDeadlockApi.js` to `frontend/src/api/`

4. Update imports in your main application component to use the enhanced components.

## Future Enhancements

1. **Historical Analysis**
   - Store analyzed deadlocks in a database
   - Track trends and patterns over time
   - Identify recurring issues

2. **Integration with PostgreSQL Logs**
   - Direct parsing of PostgreSQL logs
   - Correlation with application events

3. **Additional Analyzers**
   - MySQL deadlock analyzer
   - Oracle deadlock analyzer

4. **Machine Learning Integration**
   - Pattern recognition for deadlock prediction
   - Automatic solution recommendation
   - Anomaly detection

5. **Advanced Visualization**
   - Timeline view of deadlock sequence
   - 3D visualization for complex deadlocks
   - Animation of deadlock formation

## Credits

This enhanced implementation was created based on feedback and suggestions for improving the original deadlock analyzer. It combines best practices in parsing, visualization, and user experience to create a comprehensive tool for understanding and resolving PostgreSQL deadlocks.
