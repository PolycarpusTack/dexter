# Discover API Implementation Guide

## Summary

I've successfully integrated Sentry's Discover API into Dexter with a comprehensive set of features including:

### Backend Implementation

1. **API Router** (`backend/app/routers/discover.py`)
   - Complete REST API endpoints for Discover functionality
   - Natural language query conversion using LLM
   - Query validation and error handling
   - Save/retrieve query functionality

2. **Service Layer** (`backend/app/services/discover_service.py`)
   - Business logic for Discover operations
   - Query validation and field suggestions
   - Query examples and help documentation

3. **Sentry Client Extension** (`backend/app/services/enhanced_sentry_client.py`)
   - Added Discover API methods
   - Pagination handling
   - Error transformation and logging

### Frontend Implementation

1. **Main Page** (`frontend/src/components/Discover/DiscoverPage.tsx`)
   - Tab-based interface
   - State management for queries and results
   - Integration between components

2. **Query Builder** (`frontend/src/components/Discover/QueryBuilder.tsx`)
   - Visual query builder interface
   - Natural language input
   - Field autocomplete
   - Query examples
   - Multiple input methods (visual, natural language, JSON)

3. **Result Table** (`frontend/src/components/Discover/ResultTable.tsx`)
   - Interactive data grid
   - Sorting and filtering
   - Column visibility controls
   - Export functionality (CSV, JSON)
   - Pagination support

4. **Visualizations** (`frontend/src/components/Discover/Visualizations.tsx`)
   - Multiple chart types (line, bar, area, pie)
   - Interactive chart configuration
   - Data aggregation for grouping
   - Export functionality

## Key Features Implemented

### 1. Natural Language Query Conversion
- Uses LLM to convert natural language to Discover queries
- Context-aware query generation
- Error handling for invalid conversions

### 2. Visual Query Builder
- Drag-and-drop field selection
- Autocomplete for fields
- Real-time query validation
- Multiple time range options

### 3. Result Visualization
- Interactive charts using Recharts
- Multiple visualization types
- Customizable chart appearance
- Data export capabilities

### 4. Query Management
- Save queries for reuse
- Tag-based organization
- Public/private query sharing
- Query history tracking

## API Endpoints

```
POST   /api/v1/discover/query              - Execute a Discover query
POST   /api/v1/discover/natural-language   - Convert natural language to query
GET    /api/v1/discover/fields             - Get available fields
GET    /api/v1/discover/examples           - Get query examples
POST   /api/v1/discover/saved-queries      - Save a query
GET    /api/v1/discover/saved-queries      - Get saved queries
GET    /api/v1/discover/syntax-help        - Get syntax documentation
```

## Usage Flow

1. **Query Creation**
   - User accesses Discover page
   - Chooses input method (visual, natural language, or JSON)
   - Builds query with field selection and filters
   - Sets time range and other parameters

2. **Query Execution**
   - Query is validated client-side
   - Sent to backend for Sentry API execution
   - Results returned with metadata

3. **Result Analysis**
   - Data displayed in interactive table
   - User can sort, filter, and search results
   - Export data in various formats

4. **Visualization**
   - Select visualization type
   - Configure axes and grouping
   - Interactive chart exploration
   - Export visualizations

## Integration with Existing Dexter

The Discover API integrates seamlessly with existing Dexter features:

1. **Authentication**: Uses existing Sentry API token
2. **Error Handling**: Follows Dexter's error handling patterns
3. **UI Components**: Uses Mantine UI consistently
4. **State Management**: React Query for data fetching
5. **API Client**: Extends existing Sentry client

## Configuration Required

### Backend (.env)
```env
SENTRY_BASE_URL=https://sentry.io/api/0
SENTRY_ORG=your-organization
SENTRY_API_TOKEN=your-api-token
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

### Frontend Setup
```typescript
// Add to your router configuration
import { DiscoverPage } from './components/Discover';

// Add route
<Route path="/discover" element={<DiscoverPage />} />
```

## Testing

A comprehensive test suite is included:

```bash
# Run backend tests
cd backend
pytest tests/test_discover_api.py -v

# Frontend testing (add to your test suite)
npm test -- --testPathPattern=Discover
```

## Deployment Checklist

1. ✅ Backend API endpoints implemented
2. ✅ Frontend components created
3. ✅ API integration complete
4. ✅ Error handling in place
5. ✅ Documentation provided
6. ✅ Test suite created
7. ⬜ Add route to main navigation
8. ⬜ Configure environment variables
9. ⬜ Deploy and test in production

## Next Steps

1. **Add to Navigation**: Include Discover in the main navigation menu
2. **User Testing**: Gather feedback on the interface
3. **Performance Optimization**: Add caching for frequently used queries
4. **Enhanced Features**:
   - Query templates
   - Advanced visualizations
   - Query scheduling
   - Alert creation from queries

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure frontend URL is in allowed origins
   - Check API endpoint configuration

2. **Authentication Failures**
   - Verify Sentry API token has correct permissions
   - Check organization slug matches

3. **Query Errors**
   - Validate query syntax using help documentation
   - Check field names match Sentry's schema

4. **Performance Issues**
   - Limit result set size
   - Use appropriate time ranges
   - Add specific filters

## Maintenance

1. **Field Updates**: Periodically update available fields from Sentry
2. **Query Examples**: Add new examples based on usage patterns
3. **Performance Monitoring**: Track query execution times
4. **Error Tracking**: Monitor error logs for common issues

## Conclusion

The Discover API integration provides Dexter users with powerful data exploration capabilities. The implementation follows best practices for both backend and frontend development, ensuring maintainability and scalability.

The modular architecture allows for easy extension and modification of features as requirements evolve. With comprehensive error handling, testing, and documentation, the feature is ready for production use.
