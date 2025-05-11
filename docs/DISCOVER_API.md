# Discover API Integration

## Overview

The Discover API integration for Dexter provides a powerful interface to Sentry's Discover feature, allowing users to explore and analyze their error and performance data through custom queries, visualizations, and natural language processing.

## Features

- **Query Builder**: Visual and code-based query building interface
- **Natural Language Queries**: Convert natural language to Discover queries using AI
- **Result Table**: Interactive data grid with sorting, filtering, and export
- **Data Visualization**: Multiple chart types (line, bar, area, pie)
- **Query Management**: Save, share, and manage queries
- **Real-time Execution**: Execute queries against Sentry's API with pagination

## Architecture

### Backend Components

1. **Discover Router** (`backend/app/routers/discover.py`)
   - Handles all Discover API endpoints
   - Query execution and validation
   - Natural language processing integration
   - Saved query management

2. **Discover Service** (`backend/app/services/discover_service.py`)
   - Business logic for Discover operations
   - Query validation and transformation
   - Field suggestions and examples

3. **Enhanced Sentry Client** (`backend/app/services/enhanced_sentry_client.py`)
   - Direct integration with Sentry's Discover API
   - Pagination handling
   - Error management

### Frontend Components

1. **DiscoverPage** (`frontend/src/components/Discover/DiscoverPage.tsx`)
   - Main container component
   - Tab navigation and state management
   - Query execution orchestration

2. **QueryBuilder** (`frontend/src/components/Discover/QueryBuilder.tsx`)
   - Visual query building interface
   - Natural language input
   - Field selection and filtering

3. **ResultTable** (`frontend/src/components/Discover/ResultTable.tsx`)
   - Data display and manipulation
   - Sorting, filtering, and pagination
   - Export functionality

4. **Visualizations** (`frontend/src/components/Discover/Visualizations.tsx`)
   - Chart rendering using Recharts
   - Multiple visualization types
   - Interactive chart configuration

## API Endpoints

### Execute Query
```
POST /api/v1/discover/query
```
Execute a Discover query against Sentry's API.

**Request Body:**
```json
{
  "fields": [
    { "field": "count()", "alias": "event_count" },
    { "field": "p95(transaction.duration)", "alias": "p95_duration" }
  ],
  "query": "transaction.duration:>1s",
  "orderby": "-count()",
  "statsPeriod": "24h",
  "limit": 50
}
```

### Natural Language Query
```
POST /api/v1/discover/natural-language
```
Convert natural language to a Discover query.

**Request Body:**
```json
{
  "query": "Show me the slowest transactions in the last 24 hours",
  "context": {}
}
```

### Get Available Fields
```
GET /api/v1/discover/fields?partial=trans
```
Get available fields for Discover queries with optional partial matching.

### Get Query Examples
```
GET /api/v1/discover/examples
```
Get example queries for user guidance.

### Save Query
```
POST /api/v1/discover/saved-queries
```
Save a Discover query for later use.

### Get Saved Queries
```
GET /api/v1/discover/saved-queries?isPublic=true&tags=performance
```
Retrieve saved queries with optional filters.

### Get Syntax Help
```
GET /api/v1/discover/syntax-help
```
Get query syntax documentation and examples.

## Query Syntax

### Basic Structure
```
field:value AND field2:value2
```

### Operators
- `:` - equals
- `!:` - does not equal
- `:>` - greater than
- `:<` - less than
- `:>=` - greater than or equal to
- `:<=` - less than or equal to

### Functions
- `count()` - Count of events
- `count_unique(field)` - Unique count
- `avg(field)` - Average
- `sum(field)` - Sum
- `p50(field)`, `p75(field)`, `p95(field)`, `p99(field)` - Percentiles
- `failure_rate()` - Failure rate
- `apdex(threshold)` - Apdex score

### Time Ranges
- Relative: `1h`, `24h`, `7d`, `30d`, `90d`
- Absolute: ISO 8601 format (e.g., `2024-01-01T00:00:00`)

## Usage Examples

### Basic Error Count Query
```javascript
const query = {
  fields: [
    { field: 'count()' },
    { field: 'error.type' }
  ],
  query: 'level:error',
  orderby: '-count()',
  statsPeriod: '24h'
};
```

### Performance Analysis
```javascript
const query = {
  fields: [
    { field: 'transaction' },
    { field: 'p95(transaction.duration)', alias: 'p95_duration' },
    { field: 'count()' }
  ],
  query: 'transaction.duration:>1s',
  orderby: '-p95_duration',
  statsPeriod: '7d'
};
```

### User Impact Analysis
```javascript
const query = {
  fields: [
    { field: 'title' },
    { field: 'count_unique(user)', alias: 'unique_users' },
    { field: 'count()', alias: 'total_events' }
  ],
  query: 'level:error',
  orderby: '-unique_users',
  statsPeriod: '24h'
};
```

## Configuration

### Environment Variables
```bash
# Sentry Configuration
SENTRY_BASE_URL=https://sentry.io/api/0
SENTRY_ORG=your-org
SENTRY_API_TOKEN=your-token

# LLM Configuration (for natural language queries)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

### Frontend Configuration
```typescript
// api/discover.ts
const discoverApi = {
  executeQuery: async (query: DiscoverQuery) => { ... },
  convertNaturalLanguage: async (naturalQuery: any) => { ... },
  // ... other methods
};
```

## Error Handling

The Discover API integration includes comprehensive error handling:

1. **Validation Errors**: Input validation on both frontend and backend
2. **API Errors**: Proper error responses from Sentry API
3. **Network Errors**: Graceful handling of connectivity issues
4. **Query Errors**: Syntax and semantic query validation

## Performance Considerations

1. **Pagination**: Large result sets are paginated
2. **Caching**: Results can be cached for repeated queries
3. **Query Optimization**: Fields and filters are optimized
4. **Lazy Loading**: Components load data as needed

## Security

1. **Authentication**: All requests require valid API tokens
2. **Authorization**: User permissions are respected
3. **Input Validation**: All inputs are sanitized
4. **Rate Limiting**: API calls are rate-limited

## Testing

Run tests with:
```bash
pytest tests/test_discover_api.py -v
```

## Troubleshooting

### Common Issues

1. **Empty Results**
   - Check query syntax
   - Verify time range
   - Ensure data exists for query

2. **Authentication Errors**
   - Verify API token
   - Check organization slug
   - Ensure proper permissions

3. **Query Timeouts**
   - Reduce query complexity
   - Narrow time range
   - Add more specific filters

## Future Enhancements

1. **Advanced Visualizations**: More chart types and customization
2. **Query Templates**: Pre-built query templates
3. **Alerting**: Create alerts from Discover queries
4. **Export Options**: More export formats (PDF, Excel)
5. **Collaboration**: Share queries with team members
6. **Query History**: Track and replay past queries
