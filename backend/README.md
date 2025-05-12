# Dexter Backend

The Dexter backend API provides a powerful interface to Sentry data with AI-powered analysis capabilities.

## 🆕 New Architecture

**Important**: Dexter now uses a consolidated architecture with a single entry point and configuration-driven modes. See [README_MIGRATION.md](README_MIGRATION.md) for details.

Key changes:
- Single entry point (`app/main.py`)
- Mode selection via `APP_MODE` environment variable
- Configuration via YAML files in `config/` directory

The old `main_*.py` files still exist for backward compatibility but will be deprecated in the future.

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
   # Run with default mode
   python run.py
   
   # Or run with a specific mode
   python run.py debug
   ```

   The API will be available at `http://localhost:8001`

## Running with Different Modes

Dexter supports several application modes:

```bash
# Default mode
python -m app.main

# Debug mode (enhanced logging, all features)
set APP_MODE=debug && python -m app.main

# Minimal mode (lightweight, fewer features)
set APP_MODE=minimal && python -m app.main

# Enhanced mode (all features, optimized for production)
set APP_MODE=enhanced && python -m app.main

# Simplified mode (core features only)
set APP_MODE=simplified && python -m app.main
```

You can also use the provided batch files:
```bash
# These still work the same:
run_minimal.bat
start_dev_server.bat
run_simplified.bat
```

## Configuration

### Environment Variables

The following environment variables are required:

- `SENTRY_API_TOKEN`: Your Sentry API authentication token
- `SENTRY_ORGANIZATION_SLUG`: Your Sentry organization slug (optional but recommended)
- `SENTRY_PROJECT_SLUG`: Your default Sentry project slug (optional but recommended)

Optional configurations:
- `APP_MODE`: Application mode (default, debug, minimal, enhanced, simplified)
- `OLLAMA_BASE_URL`: URL for the Ollama LLM service (default: http://localhost:11434)
- `OLLAMA_MODEL`: Model to use with Ollama (default: mistral:latest)
- `USE_MOCK_DATA`: Set to "true" to use mock data for development

### YAML Configuration

You can also configure the application using YAML files in the `config/` directory:

- `base.yaml`: Common settings for all modes
- `debug.yaml`: Settings for debug mode
- `minimal.yaml`: Settings for minimal mode
- `enhanced.yaml`: Settings for enhanced mode
- `simplified.yaml`: Settings for simplified mode

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

### Architecture Migration Issues

If you encounter issues with the new architecture:
1. Check the migration documentation in `MIGRATION_GUIDE.md`
2. Try running with different modes to isolate the issue
3. Look for deprecation warnings that might indicate outdated usage patterns

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Resources

- [QUICK_REFERENCE.md](QUICK_REFERENCE.md): Developer's quick reference guide
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md): Detailed migration information
- [ADOPTION_STRATEGY.md](ADOPTION_STRATEGY.md): Phase-by-phase adoption plan
