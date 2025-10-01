# Dexter Deployment Documentation

Welcome to the Dexter deployment documentation. This directory contains comprehensive guides for deploying and configuring Dexter in various environments.

## Available Guides

### [Complete Deployment Guide](./DEPLOYMENT_GUIDE.md)
A comprehensive end-to-end guide covering both backend and frontend deployment, from local development to production.

### [Backend Deployment](./BACKEND_DEPLOYMENT.md)
Detailed instructions for deploying the Dexter backend service, including:
- Server requirements
- Environment configuration
- Docker deployment
- Native installation
- Security best practices
- Monitoring & logging
- Troubleshooting

### [Frontend Deployment](./FRONTEND_DEPLOYMENT.md)
Complete guide for building and deploying the Dexter frontend, including:
- Build process details
- Various deployment options
- Environment configuration
- Performance optimization
- Security considerations
- Common issues and solutions

## Quick Start

### Deploy Backend and Frontend Locally

```bash
# Clone repository
git clone https://github.com/your-org/dexter.git
cd dexter

# Start backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install poetry
poetry install
cp .env.example .env
# Edit .env with your Sentry API token
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal, start frontend
cd frontend
npm install
npm run dev
```

### Deploy to Production with Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - SENTRY_API_TOKEN=${SENTRY_API_TOKEN}
      - SENTRY_ORGANIZATION_SLUG=${SENTRY_ORGANIZATION_SLUG}
      - CORS_ORIGINS=["https://dexter.your-domain.com"]
      - SECRET_KEY=${SECRET_KEY}
    ports:
      - "8000:8000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
    restart: unless-stopped
    depends_on:
      - backend
```

Deploy:
```bash
export SENTRY_API_TOKEN=your_sentry_token
export SENTRY_ORGANIZATION_SLUG=your_org
export SECRET_KEY=$(openssl rand -hex 32)

docker-compose up -d
```

## Additional Resources

- [Sentry API Documentation](https://docs.sentry.io/api/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [React Deployment](https://create-react-app.dev/docs/deployment/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)

## Need Help?

If you encounter issues during deployment:
1. Check the troubleshooting sections in the relevant guides
2. Review application logs for error messages
3. Open an issue on the GitHub repository
4. Contact the maintenance team at support@example.com