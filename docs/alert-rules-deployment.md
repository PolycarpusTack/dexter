# Alert Rules Deployment Guide

## Backend Setup

### 1. Install Dependencies
The alert rules implementation uses the existing FastAPI and Pydantic dependencies. No additional packages are required.

### 2. Update Environment Variables
Ensure your `.env` file has the necessary Sentry configuration:

```env
SENTRY_API_TOKEN=your_sentry_api_token
SENTRY_BASE_URL=https://sentry.io/api/0
SENTRY_WEB_URL=https://sentry.io
```

### 3. Register the Router
The alerts router is already registered in `main.py`:
```python
from .routers import alerts
app.include_router(alerts.router, prefix=API_PREFIX, tags=["Alerts"])
```

### 4. Run the Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

## Frontend Setup

### 1. Install Dependencies
Ensure all required packages are installed:
```bash
cd frontend
npm install
```

The key dependencies are:
- `react-router-dom` - For routing
- `@mantine/core` - UI components
- `@mantine/form` - Form handling
- `axios` - API calls

### 2. Environment Configuration
Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SENTRY_WEB_URL=https://sentry.io
```

### 3. Run the Frontend
```bash
cd frontend
npm run dev
```

## Testing the Implementation

### 1. Backend API Testing
Test the endpoints using curl or Postman:

```bash
# List alert rules
curl http://localhost:8000/api/v1/projects/org/project/rules

# Create an issue alert rule
curl -X POST http://localhost:8000/api/v1/projects/org/project/rules \
  -H "Content-Type: application/json" \
  -d '{
    "rule_type": "issue",
    "rule_data": {
      "name": "Test Rule",
      "actionMatch": "all",
      "conditions": [{"id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"}],
      "actions": [{"id": "sentry.mail.actions.NotifyEmailAction", "targetType": "IssueOwners"}],
      "frequency": 30
    }
  }'
```

### 2. Frontend Testing
1. Navigate to http://localhost:5173 (or your configured port)
2. Configure Sentry organization and project in the settings
3. Navigate to Alert Rules from the menu
4. Test creating, editing, and deleting rules

## Production Deployment

### 1. Backend
```bash
# Build and deploy using your preferred method
docker build -t dexter-backend .
docker run -p 8000:8000 dexter-backend
```

### 2. Frontend
```bash
# Build for production
npm run build

# Serve using a static file server
npm install -g serve
serve -s dist
```

### 3. Environment Variables
Ensure production environment variables are properly set:

Backend:
```env
SENTRY_API_TOKEN=<production_token>
SENTRY_BASE_URL=https://sentry.io/api/0
LOG_LEVEL=INFO
```

Frontend:
```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_SENTRY_WEB_URL=https://sentry.io
```

## Security Considerations

1. **API Token Security**: Never expose the Sentry API token to the frontend
2. **CORS Configuration**: Ensure proper CORS settings in production
3. **Input Validation**: All inputs are validated at both frontend and backend
4. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## Monitoring

1. **Error Tracking**: Monitor for API errors and validation failures
2. **Performance**: Track response times for alert rule operations
3. **Usage Metrics**: Monitor which rule types are most commonly created

## Rollback Plan

If issues arise, you can disable the alert rules feature by:

1. Removing the router registration from `main.py`
2. Hiding the navigation item in `App.tsx`
3. The existing data in Sentry remains unaffected

## Verification Checklist

- [ ] Backend server starts without errors
- [ ] All API endpoints respond correctly
- [ ] Frontend loads without console errors
- [ ] Navigation to Alert Rules works
- [ ] Create rule functionality works
- [ ] Edit rule functionality works
- [ ] Delete rule functionality works
- [ ] Error handling shows appropriate messages
- [ ] Form validation prevents invalid submissions
