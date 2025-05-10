# Dexter Backend

The Dexter backend API provides a powerful interface to Sentry data with AI-powered analysis capabilities.

## Setup Instructions

1. **Clone the repository and navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment and activate it:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and add your Sentry API token and organization/project slugs
   ```

5. **Run the development server:**
   ```bash
   python run.py
   ```

   The API will be available at `http://localhost:8001`

## Configuration

The following environment variables are required:

- `SENTRY_API_TOKEN`: Your Sentry API authentication token
- `SENTRY_ORGANIZATION_SLUG`: Your Sentry organization slug (optional but recommended)
- `SENTRY_PROJECT_SLUG`: Your default Sentry project slug (optional but recommended)

Optional configurations:
- `OLLAMA_BASE_URL`: URL for the Ollama LLM service (default: http://localhost:11434)
- `OLLAMA_MODEL`: Model to use with Ollama (default: mistral:latest)
- `USE_MOCK_DATA`: Set to "true" to use mock data for development

## API Endpoints

The backend provides the following main API routes:

### Issues
- `GET /api/v1/issues` - List issues with filtering
- `GET /api/v1/issue/{issue_id}/events` - List events for an issue

### Events
- `GET /api/v1/event/{event_id}` - Get event details
- `GET /api/v1/events` - List events with filtering

### Analytics
- `GET /api/v1/analytics/issues/{issue_id}/impact` - Get issue impact data
- `GET /api/v1/analytics/issues/{issue_id}/frequency` - Get issue frequency data
- `GET /api/v1/analytics/issues/{issue_id}/tags` - Get issue tag distribution

### AI
- `POST /api/v1/ai/explain` - Get AI explanation for an error
- `POST /api/v1/ai/generate` - Generate AI content

## Development

### Running with mock data

To run the backend with mock data (useful when developing without a Sentry account):

1. Set `USE_MOCK_DATA=true` in your `.env` file
2. Run the server normally

### CORS Configuration

CORS is configured to allow all origins during development. For production, you should restrict this to your frontend domain.

## Troubleshooting

### 405 Method Not Allowed Errors

If you see 405 errors in the frontend, ensure:
1. The backend is running on the correct port (8001)
2. Your frontend is configured to use the correct backend URL
3. CORS is properly configured

### Authentication Errors

If you see authentication errors:
1. Check that your `SENTRY_API_TOKEN` is correctly set in the `.env` file
2. Ensure the token has the necessary permissions in Sentry
3. Verify the `SENTRY_BASE_URL` is correct for your Sentry instance

### Mock Data Not Working

If mock data isn't working:
1. Set `USE_MOCK_DATA=true` in your `.env` file
2. Restart the backend server
3. Check the logs for confirmation that mock data is being used

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
