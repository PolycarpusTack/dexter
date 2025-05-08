# Implementation Guide: Enhanced PostgreSQL Deadlock Analyzer

This guide provides step-by-step instructions for implementing the enhanced PostgreSQL Deadlock Analyzer in the Dexter project.

## Prerequisites

- Access to the Dexter repository
- Python 3.8+ for backend development
- Node.js 14+ for frontend development
- Basic understanding of FastAPI and React

## Implementation Steps

### 1. Create a Feature Branch

```bash
git checkout -b feature/enhanced-deadlock-analyzer
```

### 2. Backend Implementation

#### 2.1. Add Enhanced Deadlock Parser

1. Copy `enhanced_deadlock_parser.py` to `backend/app/utils/`:

```bash
cp enhanced_deadlock_parser.py backend/app/utils/
```

2. Install any missing dependencies:

```bash
pip install networkx
```

#### 2.2. Add Enhanced Analyzers Router

1. Copy `enhanced_analyzers.py` to `backend/app/routers/`:

```bash
cp enhanced_analyzers.py backend/app/routers/
```

2. Add the router to `main.py`:

```python
from app.routers import enhanced_analyzers

# Add the router with a prefix
app.include_router(enhanced_analyzers.router, prefix=API_PREFIX, tags=["Enhanced Analyzers"])
```

### 3. Frontend Implementation

#### 3.1. Add Enhanced Components

1. Copy the enhanced components to their respective directories:

```bash
cp EnhancedGraphView.jsx frontend/src/components/DeadlockDisplay/
cp EnhancedDeadlockDisplay.jsx frontend/src/components/DeadlockDisplay/
```

2. Copy the API module:

```bash
cp enhancedDeadlockApi.js frontend/src/api/
```

#### 3.2. Update Main Application Component

Modify the main application component to use the enhanced components:

```jsx
// Before
import DeadlockDisplay from './components/DeadlockDisplay';

// After
import EnhancedDeadlockDisplay from './components/DeadlockDisplay/EnhancedDeadlockDisplay';
```

And update the component usage:

```jsx
// Before
<DeadlockDisplay eventId={eventId} eventDetails={eventDetails} />

// After
<EnhancedDeadlockDisplay eventId={eventId} eventDetails={eventDetails} />
```

### 4. Testing

#### 4.1. Backend Testing

1. Run backend tests:

```bash
cd backend
pytest tests/routers/test_enhanced_analyzers.py -v
```

2. Start the backend server:

```bash
uvicorn app.main:app --reload
```

3. Test the API endpoints using curl or a REST client:

```bash
curl http://localhost:8000/api/v1/enhanced-analyzers/analyze-deadlock/some-event-id
```

#### 4.2. Frontend Testing

1. Install dependencies:

```bash
cd frontend
npm install d3
```

2. Start the frontend development server:

```bash
npm start
```

3. Navigate to a deadlock event and verify that the enhanced visualization works correctly.

### 5. Documentation

1. Add documentation files:

```bash
cp README-Deadlock-Analyzer.md ./
```

2. Update the main README.md to mention the enhanced deadlock analyzer.

### 6. Create Pull Request

1. Commit your changes:

```bash
git add .
git commit -m "Add enhanced PostgreSQL deadlock analyzer"
```

2. Push to your branch:

```bash
git push origin feature/enhanced-deadlock-analyzer
```

3. Create a pull request using the provided PR template.

## Implementation Notes

### Backend Architecture

The backend implementation follows these key principles:

1. **Modularity**: The enhanced parser is a self-contained module that can be used independently.
2. **Backward Compatibility**: The original endpoints continue to work, with new functionality available through new endpoints.
3. **Error Handling**: Comprehensive error handling is implemented at all levels.

### Frontend Architecture

The frontend implementation follows these key principles:

1. **Component Separation**: The visualization logic is separated from the display component.
2. **State Management**: React Query is used for data fetching and caching.
3. **User Experience**: The UI provides clear feedback and controls for customization.

## Troubleshooting

### Common Issues

1. **Missing Dependencies**:
   - Solution: Check the `requirements.txt` file for backend dependencies and `package.json` for frontend dependencies.

2. **API Connection Issues**:
   - Solution: Verify the API base URL in `enhancedDeadlockApi.js` matches your backend configuration.

3. **Visualization Errors**:
   - Solution: Check browser console for errors. Most D3.js issues are related to data format or DOM manipulation.

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [D3.js Documentation](https://d3js.org/)
- [PostgreSQL Documentation on Deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS)

## Contact

If you have any questions or need assistance with the implementation, please contact:
- [Your Name/Team]
- [Your Email/Contact Information]
