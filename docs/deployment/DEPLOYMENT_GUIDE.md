# Dexter Deployment Guide

This guide provides comprehensive instructions for deploying both the backend and frontend components of Dexter, from local development to production environments.

## Introduction

Dexter is a tool designed to enhance Sentry.io experience with AI-powered error analysis. It consists of:
- **Backend**: FastAPI-based Python application
- **Frontend**: React-based TypeScript application

This guide will walk you through setting up each component in various environments.

---

## Backend Deployment

### Backend Prerequisites

Before deploying the backend, ensure you have:

- Python 3.10+ installed
- Poetry (Python dependency manager)
- Access to a Sentry account with API token
- (Optional) Docker for containerized deployment
- (Optional) AWS account for cloud deployment

### Local Development Setup

#### Step 1: Clone the repository

```bash
# Clone the repository
git clone https://github.com/your-org/dexter.git
cd dexter
```

#### Step 2: Set up Python environment

Windows:
```bash
cd backend
# Option 1: Using fix_dependencies.bat (recommended for Windows)
fix_dependencies.bat
```

macOS/Linux:
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install poetry
poetry install
```

#### Step 3: Configure environment variables

```bash
# Copy example .env file
cp .env.example .env

# Edit the .env file with your Sentry API token and other settings
nano .env  # or use any text editor
```

Example `.env` file contents:
```
# Sentry API Configuration
SENTRY_API_TOKEN=your_sentry_api_token_here
SENTRY_BASE_URL=https://sentry.io/api/0/
SENTRY_WEB_URL=https://sentry.io/

# Default Organization and Project
SENTRY_ORGANIZATION_SLUG=your-org-slug
SENTRY_PROJECT_SLUG=your-project-slug

# Application Settings
DEBUG=false
PORT=8000
HOST=0.0.0.0

# CORS Settings (important for security)
CORS_ORIGINS=["http://localhost:5173", "https://your-production-domain.com"]
CORS_ALLOW_CREDENTIALS=true

# JWT Authentication Settings
SECRET_KEY=your_secret_key_here  # Generate with: openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

#### Step 4: Start the backend server

```bash
# Activate virtual environment if not already active
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **In plain English**: This starts a development server that automatically reloads when code changes, listening on all network interfaces (0.0.0.0) on port 8000.

### Docker Deployment

#### Step 1: Create Dockerfile

Create a file named `Dockerfile` in the backend directory:

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

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Step 2: Create Docker Compose configuration

Create a file named `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

#### Step 3: Build and run with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f
```

> **In plain English**: This packages the application in a container with all its dependencies and runs it in an isolated environment. Docker ensures the app runs the same way regardless of the host system.

### Cloud Deployment (AWS)

#### Step 1: Create Elastic Beanstalk application

1. Create `Dockerrun.aws.json` in the project root:

```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "your-ecr-repo/dexter-backend:latest",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8000",
      "HostPort": "8000"
    }
  ],
  "Logging": "/var/log/app"
}
```

2. Push Docker image to ECR:

```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-west-2.amazonaws.com

# Build image
docker build -t your-ecr-repo/dexter-backend:latest ./backend

# Push image
docker push your-ecr-repo/dexter-backend:latest
```

3. Deploy to Elastic Beanstalk:

```bash
# Initialize Elastic Beanstalk application
eb init -p docker dexter

# Create environment
eb create dexter-production

# Deploy
eb deploy
```

> **In plain English**: This uploads your application to AWS, which then handles running it in the cloud. AWS Elastic Beanstalk automatically handles details like scaling, load balancing, and health monitoring.

#### Step 2: Set up environment variables in AWS

1. Navigate to AWS Elastic Beanstalk console
2. Select your environment
3. Go to Configuration > Software
4. Add environment variables (same as in your .env file)

### Backend Environment Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `SENTRY_API_TOKEN` | Authentication with Sentry API | `abcdef123456...` |
| `SENTRY_BASE_URL` | Base URL for Sentry API | `https://sentry.io/api/0/` |
| `SENTRY_ORGANIZATION_SLUG` | Default Sentry organization | `your-org` |
| `CORS_ORIGINS` | Allowed origins for CORS | `["http://localhost:5173"]` |
| `SECRET_KEY` | JWT encryption key | `random-secure-string` |
| `DEBUG` | Enable debug mode | `false` in production |

### Backend Security

1. **API Tokens & Secrets**
   - Never commit tokens to version control
   - Use environment variables for all secrets
   - Rotate tokens regularly

2. **CORS Configuration**
   - Only allow necessary origins
   - Use specific origins instead of wildcard (`*`)
   - Only enable credentials if needed

3. **JWT Security**
   - Use a strong, random secret key
   - Set reasonable expiration times
   - Implement token refresh properly

4. **Network Security**
   - Use HTTPS in production
   - Consider using a WAF (Web Application Firewall)
   - Implement rate limiting

---

## Frontend Deployment

### Frontend Prerequisites

Before deploying the frontend, ensure you have:

- Node.js (v16+) installed
- npm or yarn package manager
- Access to hosting service (like Netlify, Vercel, or AWS)

### Build Process

#### Step 1: Install dependencies

```bash
cd frontend
npm install
```

#### Step 2: Create environment files

Create `.env.production` for production settings:

```
# API URL
VITE_API_BASE_URL=https://api.your-production-domain.com

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SENTRY=true
```

#### Step 3: Build for production

```bash
# Production optimized build
npm run build:prod

# Analyze bundle size (optional)
npm run build:analyze
```

> **In plain English**: This compiles your React application into optimized static files (HTML, CSS, and JavaScript) that can be served from any web server or CDN. The build process minifies code, optimizes images, and prepares everything for fast loading.

### Serving the Frontend

#### Option 1: Static hosting (Netlify/Vercel)

1. Connect repository to Netlify/Vercel
2. Configure build settings:
   - Build command: `npm run build:prod`
   - Publish directory: `dist`
3. Configure environment variables
4. Deploy

#### Option 2: AWS S3 + CloudFront

1. Create S3 bucket:

```bash
aws s3 mb s3://dexter-frontend
```

2. Upload build files:

```bash
aws s3 sync frontend/dist s3://dexter-frontend
```

3. Create CloudFront distribution pointing to S3 bucket

4. Configure routing and caching:

```json
{
  "Routes": [
    {
      "PathPattern": "/static/*",
      "TTL": 31536000
    },
    {
      "PathPattern": "/*.*",
      "TTL": 86400
    },
    {
      "PathPattern": "/*",
      "TTL": 0,
      "Forward": {
        "Path": "/index.html"
      }
    }
  ]
}
```

> **In plain English**: This puts your website files on a global network of servers (CDN) to deliver them quickly to users anywhere in the world. It also makes sure that when users refresh or navigate directly to a page, they still get to the right place.

#### Option 3: Docker (with Nginx)

1. Create `Dockerfile` in the frontend directory:

```dockerfile
# Build stage
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Copy build files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

2. Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
    }

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. Build and run with Docker:

```bash
docker build -t dexter-frontend .
docker run -p 80:80 dexter-frontend
```

### Frontend Environment Configuration

Create environment-specific configuration:

| Environment | File | Purpose |
|-------------|------|---------|
| Development | `.env.development` | Local development |
| Production | `.env.production` | Production deployment |
| Staging | `.env.staging` | Pre-production testing |

Common variables to configure:

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://api.example.com` |
| `VITE_SENTRY_DSN` | Sentry error tracking | `https://...@sentry.io/...` |
| `VITE_APP_VERSION` | App version for tracking | `1.0.0` |

### Performance Optimization

1. **Code Splitting**

```jsx
// Use React.lazy for component code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
```

2. **Image Optimization**

```jsx
// Use responsive images
<img 
  src="image.jpg"
  srcSet="image-small.jpg 480w, image-medium.jpg 768w, image-large.jpg 1200w"
  sizes="(max-width: 600px) 480px, (max-width: 1024px) 768px, 1200px"
  alt="Description"
/>
```

3. **Caching Strategy**

Configure appropriate cache headers in your web server:

```
Cache-Control: max-age=31536000, immutable
```

> **In plain English**: These optimizations make your application load faster for users by splitting it into smaller chunks that load only when needed, optimizing images for different screen sizes, and telling browsers when they can reuse files they've already downloaded.

---

## Integration Testing

Before deploying to production, run integration tests to ensure the entire system works correctly.

### Step 1: Start both backend and frontend

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 2: Run integration test script

```bash
cd backend
python test_integration.py
```

### Step 3: Test full user flow

1. Open browser to `http://localhost:5173`
2. Log in and verify authentication works
3. Test error analysis functionality
4. Test model selection and configuration

---

## Monitoring & Troubleshooting

### Backend Monitoring

1. **Logging**
   - Check logs: `docker logs dexter-backend`
   - Parse logs with tools like ELK stack

2. **Health Endpoints**
   - Monitor `/health` endpoint for application status
   - Set up automated alerts for health failures

### Frontend Monitoring

1. **Error Tracking**
   - Implement Sentry.io to track frontend errors
   - Configure alerts for error spikes

2. **Analytics**
   - Set up user analytics to track feature usage
   - Monitor performance metrics

### Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Backend returns 500 errors | Missing environment variables | Check .env file and server environment |
| CORS errors in browser | Incorrect CORS configuration | Verify CORS_ORIGINS setting includes frontend domain |
| Authentication failures | Expired or invalid tokens | Check token refresh mechanism, verify secrets |
| Slow API responses | Network latency, inefficient queries | Enable caching, optimize database queries |

---

## Updating & Maintenance

### Backend Updates

1. Pull latest code:
   ```bash
   git pull origin main
   ```

2. Update dependencies:
   ```bash
   cd backend
   poetry update
   ```

3. Run migrations (if applicable):
   ```bash
   python -m app.db.migrate
   ```

4. Restart services:
   ```bash
   docker-compose restart backend
   ```

### Frontend Updates

1. Pull latest code:
   ```bash
   git pull origin main
   ```

2. Update dependencies:
   ```bash
   cd frontend
   npm update
   ```

3. Rebuild and deploy:
   ```bash
   npm run build:prod
   # Deploy using your preferred method
   ```

### Backup Strategy

1. **Environment Configuration**
   - Keep backup copies of all .env files in a secure location
   - Document all configuration settings

2. **Database Backups** (if applicable)
   - Set up automated backup schedule
   - Test restore process regularly

---

## Conclusion

By following this guide, you've deployed Dexter's backend and frontend components for production use. The system is now ready to enhance your Sentry experience with AI-powered error analysis.

Remember to:
- Keep dependencies updated
- Monitor system performance
- Maintain secure configurations
- Regularly back up important data

For additional help or to report issues, refer to the project documentation or open a GitHub issue.