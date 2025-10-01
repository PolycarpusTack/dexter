#!/bin/bash
# Simple deployment script for Dexter

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo -e "${GREEN}"
echo "  _____            _            "
echo " |  __ \          | |           "
echo " | |  | | _____  _| |_ ___ _ __ "
echo " | |  | |/ _ \ \/ / __/ _ \ '__|"
echo " | |__| |  __/>  <| ||  __/ |   "
echo " |_____/ \___/_/\_\\__\___|_|   "
echo -e "${NC}"
echo "Deployment Script"
echo "================="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -e, --env ENV     Deployment environment (local, dev, staging, prod)"
    echo "  -b, --build       Force rebuild of containers"
    echo "  -h, --help        Show this help message"
    echo
}

# Parse arguments
ENVIRONMENT="local"
FORCE_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build)
            FORCE_BUILD=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(local|dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Must be one of: local, dev, staging, prod${NC}"
    exit 1
fi

echo -e "${GREEN}Deploying Dexter to $ENVIRONMENT environment...${NC}"

# Copy appropriate .env files
if [ "$ENVIRONMENT" != "local" ]; then
    echo -e "${YELLOW}Copying environment files for $ENVIRONMENT...${NC}"
    
    # Backend .env
    if [ -f "./backend/.env.$ENVIRONMENT" ]; then
        cp "./backend/.env.$ENVIRONMENT" "./backend/.env"
        echo "Backend .env file copied."
    else
        echo -e "${RED}Warning: Backend .env.$ENVIRONMENT file not found. Using existing .env file if it exists.${NC}"
    fi
    
    # Frontend .env
    if [ -f "./frontend/.env.$ENVIRONMENT" ]; then
        cp "./frontend/.env.$ENVIRONMENT" "./frontend/.env.production"
        echo "Frontend .env file copied."
    else
        echo -e "${RED}Warning: Frontend .env.$ENVIRONMENT file not found. Using existing .env.production file if it exists.${NC}"
    fi
fi

# Build and start containers
if [ "$FORCE_BUILD" = true ]; then
    echo -e "${YELLOW}Forcing rebuild of containers...${NC}"
    docker-compose build --no-cache
fi

echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check if backend is healthy
echo -e "${YELLOW}Checking backend health...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo -e "${GREEN}Backend is healthy!${NC}"
        BACKEND_HEALTHY=true
        break
    fi
    echo -n "."
    sleep 2
done

if [ "$BACKEND_HEALTHY" != true ]; then
    echo -e "${RED}Backend health check failed. Please check logs for errors.${NC}"
    echo "You can check logs with: docker-compose logs backend"
    exit 1
fi

# Check if frontend is accessible
echo -e "${YELLOW}Checking frontend...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo -e "${GREEN}Frontend is accessible!${NC}"
else
    echo -e "${RED}Frontend check failed. Please check logs for errors.${NC}"
    echo "You can check logs with: docker-compose logs frontend"
    exit 1
fi

# Final message
echo
echo -e "${GREEN}Dexter has been successfully deployed to $ENVIRONMENT environment!${NC}"
echo
echo "Access the application:"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:8000"
echo
echo "To check logs:"
echo "docker-compose logs -f backend"
echo "docker-compose logs -f frontend"
echo
echo "To stop the application:"
echo "docker-compose down"
echo

exit 0