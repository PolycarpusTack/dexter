#!/bin/bash
# File: run-tests.sh

# Script to run all tests with proper setup

set -e

echo "🧪 Running Dexter Tests"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required services are running
check_services() {
    echo -e "${YELLOW}Checking required services...${NC}"
    
    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        echo -e "${RED}Redis is not installed${NC}"
        exit 1
    fi
    
    if ! redis-cli ping &> /dev/null; then
        echo -e "${RED}Redis is not running${NC}"
        echo "Please start Redis with: redis-server"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Redis is running${NC}"
}

# Run backend tests
run_backend_tests() {
    echo -e "\n${YELLOW}Running backend tests...${NC}"
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    pip install pytest pytest-cov pytest-asyncio
    
    # Run tests
    pytest -v --cov=app --cov-report=html --cov-report=term-missing
    
    deactivate
    cd ..
}

# Run frontend tests
run_frontend_tests() {
    echo -e "\n${YELLOW}Running frontend tests...${NC}"
    cd frontend
    
    # Install dependencies
    npm install
    
    # Run linting
    echo -e "${YELLOW}Running linting...${NC}"
    npm run lint || true
    
    # Run type checking
    echo -e "${YELLOW}Running type checking...${NC}"
    npm run type-check || true
    
    # Run tests
    echo -e "${YELLOW}Running unit tests...${NC}"
    npm run test -- --coverage
    
    cd ..
}

# Run integration tests
run_integration_tests() {
    echo -e "\n${YELLOW}Running integration tests...${NC}"
    
    # Start backend in test mode
    cd backend
    source venv/bin/activate
    
    export ENVIRONMENT=test
    export REDIS_URL=redis://localhost:6379/0
    export SENTRY_DSN=test
    
    # Start backend server
    uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 5
    
    # Run integration tests
    pytest tests/integration/ -v -m integration
    
    # Stop backend server
    kill $BACKEND_PID || true
    
    deactivate
    cd ..
}

# Run performance benchmarks
run_benchmarks() {
    echo -e "\n${YELLOW}Running performance benchmarks...${NC}"
    cd backend
    source venv/bin/activate
    
    pytest tests/benchmarks/ -v -m slow --durations=10
    
    deactivate
    cd ..
}

# Generate coverage report
generate_coverage_report() {
    echo -e "\n${YELLOW}Generating coverage reports...${NC}"
    
    # Backend coverage
    if [ -f "backend/htmlcov/index.html" ]; then
        echo -e "${GREEN}Backend coverage report: backend/htmlcov/index.html${NC}"
    fi
    
    # Frontend coverage
    if [ -f "frontend/coverage/lcov-report/index.html" ]; then
        echo -e "${GREEN}Frontend coverage report: frontend/coverage/lcov-report/index.html${NC}"
    fi
}

# Main execution
main() {
    check_services
    
    # Parse command line arguments
    if [ "$1" == "backend" ]; then
        run_backend_tests
    elif [ "$1" == "frontend" ]; then
        run_frontend_tests
    elif [ "$1" == "integration" ]; then
        run_integration_tests
    elif [ "$1" == "benchmarks" ]; then
        run_benchmarks
    elif [ "$1" == "all" ]; then
        run_backend_tests
        run_frontend_tests
        run_integration_tests
        run_benchmarks
    else
        echo "Usage: $0 [backend|frontend|integration|benchmarks|all]"
        echo "  backend     - Run backend unit tests"
        echo "  frontend    - Run frontend unit tests"
        echo "  integration - Run integration tests"
        echo "  benchmarks  - Run performance benchmarks"
        echo "  all         - Run all tests"
        exit 1
    fi
    
    generate_coverage_report
    
    echo -e "\n${GREEN}✓ Tests completed successfully!${NC}"
}

main "$@"
