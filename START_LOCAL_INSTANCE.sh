#!/bin/bash
# Dexter Local Instance Startup Script
# This script sets up and starts the complete Dexter stack for runtime testing

set -e  # Exit on error

echo "🚀 Dexter Local Instance Startup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if running from project root
if [[ ! -f "docker-compose.yml" ]]; then
    print_error "Must run from project root directory"
    exit 1
fi

print_success "Running from project root"

# ========================================
# STEP 1: Check Prerequisites
# ========================================
echo ""
echo "STEP 1: Checking Prerequisites"
echo "-------------------------------"

# Check Docker
if command -v docker &> /dev/null; then
    print_success "Docker installed: $(docker --version)"
else
    print_error "Docker not found. Please install Docker Desktop"
    exit 1
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    print_success "Docker Compose installed: $(docker-compose --version)"
else
    print_error "Docker Compose not found"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    print_success "Node.js installed: $(node --version)"
else
    print_warning "Node.js not found (needed for local frontend dev)"
fi

# Check Python
if command -v python3 &> /dev/null; then
    print_success "Python installed: $(python3 --version)"
else
    print_error "Python 3 not found"
    exit 1
fi

# ========================================
# STEP 2: Configure Backend Environment
# ========================================
echo ""
echo "STEP 2: Configuring Backend Environment"
echo "---------------------------------------"

cd backend

# Check if .env exists
if [[ ! -f ".env" ]]; then
    print_info "Creating .env from .env.example..."
    cp .env.example .env
    print_success ".env created"
else
    print_success ".env already exists"
fi

# Check if SECRET_KEY is set (not the default)
if grep -q "CHANGE_THIS_IN_PRODUCTION" .env 2>/dev/null; then
    print_warning "SECRET_KEY is still set to default value"
    print_info "Generating secure SECRET_KEY..."

    NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")

    # Update SECRET_KEY in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|SECRET_KEY=CHANGE_THIS_IN_PRODUCTION.*|SECRET_KEY=$NEW_SECRET|" .env
    else
        # Linux
        sed -i "s|SECRET_KEY=CHANGE_THIS_IN_PRODUCTION.*|SECRET_KEY=$NEW_SECRET|" .env
    fi

    print_success "SECRET_KEY generated and set"
else
    print_success "SECRET_KEY already configured"
fi

# Install/check Python dependencies
print_info "Checking Python dependencies..."

if command -v poetry &> /dev/null; then
    print_info "Using Poetry..."
    poetry install
    print_success "Python dependencies installed via Poetry"
elif [[ -f "requirements.txt" ]]; then
    print_info "Using pip..."
    python3 -m pip install -r requirements.txt
    print_success "Python dependencies installed via pip"
else
    print_warning "No dependency manager found, continuing..."
fi

cd ..

# ========================================
# STEP 3: Configure Frontend
# ========================================
echo ""
echo "STEP 3: Configuring Frontend"
echo "----------------------------"

cd frontend

if [[ ! -d "node_modules" ]]; then
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

cd ..

# ========================================
# STEP 4: Start Infrastructure Services
# ========================================
echo ""
echo "STEP 4: Starting Infrastructure Services"
echo "----------------------------------------"

print_info "Starting PostgreSQL + Redis..."
docker-compose up -d postgres

# Wait for PostgreSQL to be healthy
print_info "Waiting for PostgreSQL to be ready..."
timeout=60
elapsed=0
while ! docker-compose exec -T postgres pg_isready -U dexter > /dev/null 2>&1; do
    if [[ $elapsed -ge $timeout ]]; then
        print_error "PostgreSQL failed to start within $timeout seconds"
        exit 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
done
echo ""
print_success "PostgreSQL is ready"

# ========================================
# STEP 5: Run Database Migrations
# ========================================
echo ""
echo "STEP 5: Running Database Migrations"
echo "-----------------------------------"

cd backend

if [[ -d "alembic" ]]; then
    print_info "Running Alembic migrations..."
    if command -v poetry &> /dev/null; then
        poetry run alembic upgrade head
    else
        python3 -m alembic upgrade head
    fi
    print_success "Database migrations completed"
else
    print_warning "No alembic directory found, skipping migrations"
fi

cd ..

# ========================================
# STEP 6: Choose Startup Mode
# ========================================
echo ""
echo "STEP 6: Choose Startup Mode"
echo "---------------------------"
echo ""
echo "Select how you want to run Dexter:"
echo ""
echo "  1) Full Docker Stack (recommended for production-like testing)"
echo "     → Backend, Frontend, PostgreSQL, Ollama all in containers"
echo "     → Access: http://localhost"
echo ""
echo "  2) Hybrid Mode (recommended for development/debugging)"
echo "     → PostgreSQL in Docker"
echo "     → Backend runs locally (port 8000)"
echo "     → Frontend runs locally (port 5175)"
echo "     → Better for debugging and hot-reload"
echo ""
echo "  3) Just Infrastructure (PostgreSQL + Redis)"
echo "     → You manually start backend/frontend"
echo ""

read -p "Enter choice (1/2/3): " choice

case $choice in
    1)
        print_info "Starting Full Docker Stack..."
        docker-compose up -d

        echo ""
        print_success "Full stack started!"
        echo ""
        echo "Services:"
        echo "  → Frontend:    http://localhost"
        echo "  → Backend API: http://localhost:8000"
        echo "  → API Docs:    http://localhost:8000/docs"
        echo "  → Health:      http://localhost:8000/health"
        echo "  → PostgreSQL:  localhost:5432"
        echo "  → Ollama:      http://localhost:11434"
        echo ""
        echo "View logs:"
        echo "  docker-compose logs -f"
        echo ""
        echo "Stop services:"
        echo "  docker-compose down"
        ;;

    2)
        print_info "Starting Hybrid Mode..."

        # Infrastructure only
        docker-compose up -d postgres

        # Start backend
        print_info "Starting Backend..."
        cd backend
        if command -v poetry &> /dev/null; then
            poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
        else
            python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
        fi
        BACKEND_PID=$!
        cd ..

        # Wait for backend to start
        sleep 5

        # Start frontend
        print_info "Starting Frontend..."
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..

        echo ""
        print_success "Hybrid mode started!"
        echo ""
        echo "Services:"
        echo "  → Frontend:    http://localhost:5175"
        echo "  → Backend API: http://localhost:8000"
        echo "  → API Docs:    http://localhost:8000/docs"
        echo "  → Health:      http://localhost:8000/health"
        echo "  → PostgreSQL:  localhost:5432"
        echo ""
        echo "PIDs:"
        echo "  Backend:  $BACKEND_PID"
        echo "  Frontend: $FRONTEND_PID"
        echo ""
        echo "Stop services:"
        echo "  kill $BACKEND_PID $FRONTEND_PID"
        echo "  docker-compose down"
        ;;

    3)
        print_info "Starting Infrastructure Only..."
        docker-compose up -d postgres

        echo ""
        print_success "Infrastructure started!"
        echo ""
        echo "Services:"
        echo "  → PostgreSQL:  localhost:5432"
        echo ""
        echo "Manually start backend:"
        echo "  cd backend && poetry run uvicorn app.main:app --reload"
        echo ""
        echo "Manually start frontend:"
        echo "  cd frontend && npm run dev"
        ;;

    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# ========================================
# STEP 7: Post-Startup Checks
# ========================================
echo ""
echo "STEP 7: Post-Startup Checks"
echo "---------------------------"

# Wait a bit for services to stabilize
sleep 3

# Check backend health
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    print_success "Backend health check passed"
else
    print_warning "Backend health check failed (may still be starting...)"
fi

# ========================================
# STEP 8: Testing Guide
# ========================================
echo ""
echo "========================================="
echo "✅ STARTUP COMPLETE"
echo "========================================="
echo ""
echo "🧪 RUNTIME TESTING GUIDE:"
echo ""
echo "1. Basic Health Check:"
echo "   curl http://localhost:8000/health"
echo ""
echo "2. Test API Documentation:"
echo "   Open: http://localhost:8000/docs"
echo ""
echo "3. Test Authentication (with new JWT validation):"
echo "   # This should FAIL (401) - invalid token"
echo "   curl -H 'Authorization: Bearer fake-token' http://localhost:8000/api/v1/issues"
echo ""
echo "4. Test Frontend:"
echo "   Open: http://localhost:5175 (hybrid) or http://localhost (docker)"
echo ""
echo "5. Test Enrichment Feature Flags:"
echo "   curl http://localhost:8000/health | jq '.features.enrichments'"
echo ""
echo "6. Test Async Redis (no blocking!):"
echo "   # Should be fast even under load"
echo "   ab -n 1000 -c 10 http://localhost:8000/health"
echo ""
echo "7. View Logs:"
echo "   # Docker mode"
echo "   docker-compose logs -f backend"
echo "   "
echo "   # Hybrid mode"
echo "   tail -f backend/logs/dexter.log"
echo ""
echo "8. Test Knowledge Base (if configured):"
echo "   curl http://localhost:8000/api/v1/knowledge-base/health"
echo ""
echo "========================================="
echo ""
