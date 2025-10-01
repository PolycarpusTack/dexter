#!/bin/bash

# Test script to validate Docker setup
echo "🐳 Testing Docker configuration for Dexter..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo "Checking required files..."

# Check backend files
test -f backend/Dockerfile && print_status 0 "Backend Dockerfile exists" || print_status 1 "Backend Dockerfile missing"
test -f backend/pyproject.toml && print_status 0 "Backend pyproject.toml exists" || print_status 1 "Backend pyproject.toml missing"
test -f backend/poetry.lock && print_status 0 "Backend poetry.lock exists" || print_status 1 "Backend poetry.lock missing"
test -f backend/app/main.py && print_status 0 "Backend main.py exists" || print_status 1 "Backend main.py missing"
test -f backend/.env.example && print_status 0 "Backend .env.example exists" || print_status 1 "Backend .env.example missing"

# Check frontend files
test -f frontend/Dockerfile && print_status 0 "Frontend Dockerfile exists" || print_status 1 "Frontend Dockerfile missing"
test -f frontend/nginx.conf && print_status 0 "Frontend nginx.conf exists" || print_status 1 "Frontend nginx.conf missing"
test -f frontend/package.json && print_status 0 "Frontend package.json exists" || print_status 1 "Frontend package.json missing"

# Check docker-compose
test -f docker-compose.yml && print_status 0 "docker-compose.yml exists" || print_status 1 "docker-compose.yml missing"

echo ""
echo "Validating Docker configuration..."

# Check docker-compose syntax if docker-compose is available
if command -v docker-compose &> /dev/null; then
    if docker-compose config --quiet 2>/dev/null; then
        print_status 0 "docker-compose.yml syntax is valid"
    else
        print_status 1 "docker-compose.yml has syntax errors"
        echo -e "${YELLOW}Run: docker-compose config for details${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  docker-compose not available, skipping syntax validation${NC}"
fi

# Check if Docker is running
if command -v docker &> /dev/null && docker info &> /dev/null; then
    print_status 0 "Docker is running"

    echo ""
    echo "🚀 Ready to run: docker-compose up --build"
    echo ""
    echo "Backend will be available at: http://localhost:8000"
    echo "Frontend will be available at: http://localhost (port 80)"
    echo "API documentation at: http://localhost:8000/docs"

else
    echo -e "${YELLOW}⚠️  Docker not running or not available${NC}"
    echo "Install Docker and Docker Compose, then run: docker-compose up --build"
fi

echo ""
echo "🔧 Don't forget to:"
echo "1. Copy backend/.env.example to backend/.env and configure your settings"
echo "2. Set SENTRY_API_TOKEN and other required environment variables"
echo "3. Update CORS_ORIGINS in .env if running on different ports"