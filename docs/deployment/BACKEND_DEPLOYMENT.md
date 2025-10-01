# Dexter Backend Deployment Guide

This guide focuses specifically on deploying and configuring the Dexter backend service.

## Table of Contents
- [Local Development Setup](#local-development-setup)
- [Server Requirements](#server-requirements)
- [Production Deployment Options](#production-deployment-options)
- [Environment Configuration](#environment-configuration)
- [Security Best Practices](#security-best-practices)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## Local Development Setup

### Step 1: Clone the repository
```bash
git clone https://github.com/your-org/dexter.git
cd dexter/backend
```

### Step 2: Create Python environment
Windows:
```bash
# Option 1: Using fix_dependencies.bat (recommended)
fix_dependencies.bat

# Option 2: Manual setup
python -m venv venv
venv\Scripts\activate
pip install poetry
poetry install
```

macOS/Linux:
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install poetry
poetry install
```

> **What's happening?** We're creating an isolated Python environment with all the required libraries specifically for this project. This keeps your project dependencies separate from other Python projects on your machine.

### Step 3: Set up environment variables
```bash
# Copy example env file
cp .env.example .env

# Edit with your favorite text editor
nano .env  # or code .env, vim .env, etc.
```

Minimum required variables:
```
SENTRY_API_TOKEN=your_token_here
SENTRY_ORGANIZATION_SLUG=your-org
```

### Step 4: Run the development server
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start server with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see output similar to:
```
INFO:     Started server process [28752]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## Server Requirements

For a production deployment, ensure your server meets these requirements:

- **CPU**: 2+ cores recommended
- **RAM**: Minimum 2GB, 4GB+ recommended
- **Disk**: At least 10GB available storage
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Python**: Version 3.10 or higher
- **Network**: 
  - Outbound access to Sentry API (sentry.io)
  - Outbound access to Ollama API (if using local LLM)
  - Inbound port 8000 (or your configured port)

## Production Deployment Options

### Option 1: Docker (Recommended)

#### Step 1: Create a production Docker image
```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir poetry

# Copy poetry configuration
COPY pyproject.toml poetry.lock ./

# Configure poetry to not use virtualenvs
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m appuser
USER appuser

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Step 2: Build and run the Docker image
```bash
# Build the image
docker build -t dexter-backend:latest .

# Run the container
docker run -d \
  --name dexter-backend \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  dexter-backend:latest
```

> **In plain English**: This creates a container with everything the app needs to run, completely isolated from the host system. It's like shipping your application in a completely self-contained box with its own environment.

### Option 2: Native Installation

#### Step 1: Set up Python and dependencies
```bash
# Install Python 3.10
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip

# Create directory for app
sudo mkdir -p /opt/dexter
sudo chown $(whoami):$(whoami) /opt/dexter

# Clone repository
git clone https://github.com/your-org/dexter.git /opt/dexter
cd /opt/dexter/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate
pip install poetry
poetry install --no-dev
```

#### Step 2: Create systemd service
Create a file at `/etc/systemd/system/dexter.service`:

```ini
[Unit]
Description=Dexter Backend Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/dexter/backend
ExecStart=/opt/dexter/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5s
EnvironmentFile=/opt/dexter/backend/.env

[Install]
WantedBy=multi-user.target
```

#### Step 3: Start and enable the service
```bash
sudo systemctl daemon-reload
sudo systemctl start dexter
sudo systemctl enable dexter
sudo systemctl status dexter
```

### Option 3: Using Nginx and Gunicorn

For production workloads, use Gunicorn with Nginx:

#### Step 1: Install Gunicorn
```bash
pip install gunicorn
```

#### Step 2: Create Gunicorn service file
Create `/etc/systemd/system/dexter.service`:

```ini
[Unit]
Description=Dexter Gunicorn Daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/dexter/backend
ExecStart=/opt/dexter/backend/venv/bin/gunicorn \
          -w 4 \
          -k uvicorn.workers.UvicornWorker \
          -b 127.0.0.1:8000 \
          app.main:app
Restart=on-failure
RestartSec=5s
EnvironmentFile=/opt/dexter/backend/.env

[Install]
WantedBy=multi-user.target
```

#### Step 3: Configure Nginx
Create `/etc/nginx/sites-available/dexter`:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Enable SSL in production
    # listen 443 ssl;
    # ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/dexter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

> **What's happening?** We're setting up a more robust production architecture where Gunicorn manages multiple worker processes and Nginx handles tasks like SSL termination, rate limiting, and serving as a reverse proxy.

## Environment Configuration

### Critical Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SENTRY_API_TOKEN` | Your Sentry API token | None | Yes |
| `SENTRY_BASE_URL` | Sentry API endpoint | https://sentry.io/api/0/ | No |
| `SENTRY_ORGANIZATION_SLUG` | Your Sentry organization slug | None | Yes |
| `SENTRY_PROJECT_SLUG` | Default project to analyze | None | No |
| `PORT` | Port to run the server on | 8000 | No |
| `HOST` | Host to bind to | 0.0.0.0 | No |
| `DEBUG` | Enable debug mode | false | No |
| `SECRET_KEY` | Secret key for JWT tokens | None | Yes in production |
| `CORS_ORIGINS` | Allowed origins for CORS | ["*"] | Yes in production |
| `OLLAMA_BASE_URL` | URL to Ollama API | http://localhost:11434 | If using Ollama |

### Production Environment Example

```
# Sentry Configuration
SENTRY_API_TOKEN=abcdef1234567890abcdef1234567890abcdef12
SENTRY_BASE_URL=https://sentry.io/api/0/
SENTRY_ORGANIZATION_SLUG=your-org
SENTRY_PROJECT_SLUG=your-project

# App Configuration
DEBUG=false
PORT=8000
HOST=0.0.0.0
SECRET_KEY=generate_a_secure_random_key_here
LOG_LEVEL=INFO

# CORS Settings (very important for security)
CORS_ORIGINS=["https://dexter.your-domain.com", "https://app.your-domain.com"]
CORS_ALLOW_CREDENTIALS=true

# AI Configuration
OLLAMA_BASE_URL=http://ollama-service:11434
OLLAMA_MODEL=mistral:latest
OLLAMA_TIMEOUT=60
```

> **Security Tip**: Generate a secure SECRET_KEY with `openssl rand -hex 32`

## Security Best Practices

### API Token Security
- Never commit API tokens to git
- Use environment variables for all secrets
- Consider using a secrets manager in production
- Rotate tokens regularly

### CORS Configuration
- In production, specify exact domains in CORS_ORIGINS
- Avoid using wildcard "*" in production
- Only enable credentials if needed

### Network Security
- Always use HTTPS in production
- Put the API behind a load balancer with WAF capabilities
- Configure rate limiting to prevent abuse
- Use network segmentation for Ollama if applicable

### Authentication
- Implement proper JWT token expiration
- Use secure cookie settings if applicable
- Implement IP-based rate limiting for auth endpoints

## Monitoring & Logging

### Logging Configuration
Dexter uses Python's logging module. You can configure it by setting:

```
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, or CRITICAL
LOG_FORMAT=standard  # or "json" for structured logging
```

### Health Checks
The backend provides a `/health` endpoint that returns:
```json
{
  "status": "healthy",
  "service": "dexter-api-default"
}
```

Configure your monitoring system to periodically check this endpoint.

### Metrics
For production deployments, consider setting up:
- Prometheus metrics collection
- Grafana dashboards for visualization
- Alerts for error rates, API response times, etc.

Example Prometheus metric:
```python
REQUEST_TIME = Summary('request_processing_seconds', 'Time spent processing request')

@REQUEST_TIME.time()
async def process_request(request):
    # ...
```

## Troubleshooting

### Common Issues

#### API 401 Unauthorized
**Problem**: Sentry API returns 401 errors
**Possible causes**:
- SENTRY_API_TOKEN is invalid or expired
- Token lacks required scopes
**Solution**: 
- Verify token in the Sentry UI
- Generate a new token with appropriate permissions

#### CORS Errors
**Problem**: Frontend gets CORS errors when calling API
**Possible causes**:
- CORS_ORIGINS doesn't include the frontend domain
- Credentials settings mismatch
**Solution**:
- Check CORS_ORIGINS in .env includes exact frontend origin
- Ensure credentials settings match in frontend and backend

#### Memory Issues
**Problem**: Backend crashes with OOM errors
**Possible causes**:
- Large responses not being paginated
- Memory leaks in LLM integration
**Solution**:
- Implement pagination for large result sets
- Monitor memory usage
- Increase container memory limits

#### Slow Responses
**Problem**: API responses are slow
**Possible causes**:
- Slow Sentry API
- LLM processing time
- Network latency
**Solution**:
- Implement caching for common queries
- Add timeouts for external services
- Optimize database queries

### Debugging Tools

#### Check Logs
```bash
# Docker
docker logs dexter-backend

# Systemd
journalctl -u dexter

# Checking specific log patterns
grep "ERROR" /var/log/dexter/app.log
```

#### Verify App Status
```bash
# Check if running
curl http://localhost:8000/health

# Check API connectivity
curl http://localhost:8000/api/v1/diagnostics/status
```

#### Database Inspection (if applicable)
```bash
# Connect to database
psql -U dexter -d dexter_db

# Check table status
SELECT count(*) FROM events;
```

---

## Conclusion

This guide covers the essentials for deploying the Dexter backend in development and production environments. For advanced topics like high availability deployment, database scaling, or custom authentication integration, refer to the extended documentation or open an issue in the GitHub repository.