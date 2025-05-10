# Dexter Troubleshooting Guide

This guide helps you resolve common issues when developing or running Dexter.

## 405 Method Not Allowed Errors

### Symptoms
- Frontend shows "405 Method Not Allowed" errors in the console
- API calls fail with status code 405

### Solution

1. **Check the backend is running on the correct port:**
   ```bash
   # In the backend directory
   python run.py
   # Should show: INFO:     Uvicorn running on http://127.0.0.1:8001
   ```

2. **Verify frontend environment configuration:**
   ```bash
   # Check frontend/.env
   VITE_API_BASE_URL=http://localhost:8001/api/v1
   ```

3. **Restart both servers:**
   ```bash
   # Backend (in backend directory)
   python run.py
   
   # Frontend (in frontend directory) 
   npm run dev
   ```

4. **Clear browser cache and reload the page**

### Root Cause
The frontend was trying to connect to the wrong backend port (8000 instead of 8001).

## CORS Errors

### Symptoms
- "Access to fetch at ... has been blocked by CORS policy"
- Network errors when calling the API

### Solution

1. **Check backend CORS configuration:**
   - Backend is configured to allow all origins in development
   - Make sure the backend is running

2. **Verify the API URL:**
   - Ensure no typos in the API URL
   - Check that the protocol (http://) is correct

3. **Try a different browser or incognito mode**

## Authentication Errors

### Symptoms
- 401 Unauthorized errors from Sentry API
- "Authentication failed" messages

### Solution

1. **Check Sentry API token:**
   ```bash
   # In backend/.env
   SENTRY_API_TOKEN=your_actual_token_here
   ```

2. **Verify token permissions in Sentry:**
   - Go to Sentry Settings > API Tokens
   - Ensure the token has necessary permissions
   - Common required scopes: `project:read`, `event:read`, `issue:read`

3. **Test with mock data:**
   ```bash
   # In backend/.env
   USE_MOCK_DATA=true
   ```

## Missing Data in UI

### Symptoms
- Empty tables or missing information
- Components showing loading states indefinitely

### Solution

1. **Check API responses:**
   - Open browser DevTools > Network tab
   - Look for failed API calls
   - Check response data structure

2. **Verify organization and project settings:**
   ```bash
   # In backend/.env
   SENTRY_ORGANIZATION_SLUG=your-org-slug
   SENTRY_PROJECT_SLUG=your-project-slug
   ```

3. **Enable mock data for testing:**
   ```bash
   # In backend/.env
   USE_MOCK_DATA=true
   ```

## LLM/AI Features Not Working

### Symptoms
- AI explanations fail or timeout
- Deadlock analysis not working

### Solution

1. **Check Ollama is running:**
   ```bash
   # Should be running on port 11434
   curl http://localhost:11434/api/version
   ```

2. **Install Ollama if needed:**
   - Visit https://ollama.ai
   - Download and install Ollama
   - Pull the required model: `ollama pull mistral:latest`

3. **Verify Ollama configuration:**
   ```bash
   # In backend/.env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=mistral:latest
   ```

## Database/PostgreSQL Errors

### Symptoms
- Deadlock analysis not detecting PostgreSQL errors
- Missing database information

### Solution

1. **Check error format:**
   - Ensure PostgreSQL errors include error code 40P01
   - Verify the error message contains deadlock details

2. **Test with mock deadlock data:**
   - Enable mock data in backend
   - Test with provided mock deadlock events

## Build/Compilation Errors

### Frontend TypeScript Errors

```bash
# Check types
npm run type-check

# Fix common issues
npm install
npm run lint:fix
```

### Backend Import Errors

```bash
# Ensure virtual environment is activated
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

## Performance Issues

### Slow API Responses

1. **Check network latency:**
   - Test direct Sentry API calls
   - Monitor backend logs for slow queries

2. **Enable API response caching:**
   - React Query caching is enabled by default
   - Adjust cache times in query options

3. **Reduce data payload:**
   - Use pagination effectively
   - Filter unnecessary data in API calls

## Development Environment Issues

### Port Already in Use

```bash
# Find process using port (Windows)
netstat -ano | findstr :8001

# Kill process (Windows)
taskkill /PID <process_id> /F

# Find process using port (macOS/Linux)
lsof -i :8001

# Kill process (macOS/Linux)
kill -9 <process_id>
```

### Environment Variables Not Loading

1. **Check .env file location:**
   - Backend: `backend/.env`
   - Frontend: `frontend/.env`

2. **Restart development servers after changes**

3. **Verify variable names:**
   - Frontend variables must start with `VITE_`
   - Backend uses standard environment variable names

## Deployment Issues

### Production Build Failures

1. **Frontend build:**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

2. **Backend deployment:**
   - Ensure all environment variables are set
   - Use production WSGI server (e.g., Gunicorn)
   - Configure proper CORS origins for production

### Missing Static Files

1. **Check build output:**
   - Frontend: `dist` directory
   - Ensure all assets are included

2. **Configure web server:**
   - Serve static files correctly
   - Set proper MIME types

## Getting Help

If you encounter issues not covered here:

1. **Check the logs:**
   - Backend: Console output
   - Frontend: Browser console and DevTools

2. **Enable debug logging:**
   ```bash
   # In backend/.env
   LOG_LEVEL=DEBUG
   ```

3. **Create an issue:**
   - Include error messages
   - Provide steps to reproduce
   - Mention your environment (OS, Node version, Python version)

## Common Error Messages and Solutions

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "405 Method Not Allowed" | Wrong API endpoint or port | Check API URLs and backend port |
| "Network Error" | CORS or backend not running | Ensure backend is running, check CORS |
| "401 Unauthorized" | Invalid Sentry token | Verify API token in backend/.env |
| "Cannot read property of undefined" | Missing data in API response | Check API response structure |
| "Module not found" | Missing dependency | Run npm install or pip install |
| "Port already in use" | Another process using the port | Kill the process or use different port |

## Quick Fixes Checklist

- [ ] Backend running on port 8001
- [ ] Frontend .env has correct API URL
- [ ] Sentry API token is valid
- [ ] Organization and project slugs are set
- [ ] Ollama is running (for AI features)
- [ ] Browser cache cleared
- [ ] Both servers restarted after config changes
