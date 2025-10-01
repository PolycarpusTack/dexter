# Docker Deployment Guide

This guide covers running Dexter using Docker and Docker Compose.

## Quick Start

1. **Clone and setup environment:**
   ```bash
   git clone <repository-url>
   cd dexter
   cp backend/.env.example backend/.env
   ```

2. **Configure environment variables:**
   Edit `backend/.env` and set:
   - `SENTRY_API_TOKEN` - Your Sentry API token
   - `SECRET_KEY` - A secure random string (32+ characters)
   - `CSRF_SECRET` - Another secure random string (32+ characters)
   - `SENTRY_ORGANIZATION_SLUG` - Your Sentry organization
   - `SENTRY_PROJECT_SLUG` - Your Sentry project

3. **Start the application:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Services

The docker-compose setup includes:

- **Backend** (Port 8000): FastAPI application with AI capabilities
- **Frontend** (Port 80): React application served by Nginx
- **Ollama** (Port 11434): Local LLM service for AI explanations

## Configuration

### Backend Environment Variables

Key environment variables in `backend/.env`:

```bash
# Security (REQUIRED)
SECRET_KEY=your-secure-secret-key
CSRF_SECRET=your-csrf-secret-key

# Sentry Integration (REQUIRED)
SENTRY_API_TOKEN=your-sentry-token
SENTRY_ORGANIZATION_SLUG=your-org
SENTRY_PROJECT_SLUG=your-project

# AI Features
OLLAMA_BASE_URL=http://ollama:11434
ENABLE_OLLAMA=true

# CORS for frontend
CORS_ORIGINS=["http://localhost", "http://localhost:5173"]
```

### Frontend Environment Variables

Set during build via docker-compose args:

- `VITE_API_BASE_URL`: Backend API URL
  - For Docker: `/api/v1` (uses nginx proxy)
  - For local dev: `http://localhost:8000` (direct backend connection, `/api/v1` is auto-appended)

## Development vs Production

### Development
```bash
# Use the default docker-compose.yml
docker-compose up --build
```

### Production
```bash
# Override environment variables
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or set production environment variables
VITE_API_BASE_URL=https://api.yourdomain.com docker-compose up -d
```

## Health Checks

Both services include health checks:

- Backend: `GET /health`
- Frontend: `GET /health`

## Logs

View logs for specific services:
```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# All logs
docker-compose logs
```

## Testing

### Backend Tests

Run tests locally using Poetry (recommended):
```bash
cd backend
poetry run pytest -v
```

Alternatively, if you have the package installed:
```bash
cd backend
pytest -v
```

**Note**: If you get `ModuleNotFoundError: No module named 'app'`, use Poetry or install the package first.

### Frontend Tests

```bash
cd frontend
npm test
```

## Troubleshooting

### Common Issues

1. **Backend fails to start**: Check environment variables in `backend/.env`
2. **Frontend can't reach backend**: Verify CORS settings
3. **Build failures**: Ensure all required files are present (run `./test-docker-setup.sh`)
4. **Test import errors**: Use `poetry run pytest -v` in the backend directory

### Validation Scripts

Run the validation script to check your Docker setup:
```bash
./test-docker-setup.sh
```

After starting the backend, run the smoke test to verify functionality:
```bash
cd backend && python smoke_test.py
```

These scripts help ensure your deployment is working correctly.