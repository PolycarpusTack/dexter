# File: run-tests.ps1

# PowerShell script to run all tests on Windows

Write-Host "🧪 Running Dexter Tests" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Check if required services are running
function Check-Services {
    Write-Host "`nChecking required services..." -ForegroundColor Yellow
    
    # Check Redis
    try {
        $redisTest = redis-cli ping
        if ($redisTest -eq "PONG") {
            Write-Host "✓ Redis is running" -ForegroundColor Green
        } else {
            Write-Host "Redis is not responding properly" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Redis is not running or redis-cli is not in PATH" -ForegroundColor Red
        Write-Host "Please start Redis or install it from https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
        exit 1
    }
}

# Run backend tests
function Run-BackendTests {
    Write-Host "`nRunning backend tests..." -ForegroundColor Yellow
    Set-Location backend
    
    # Create virtual environment if it doesn't exist
    if (-not (Test-Path "venv")) {
        python -m venv venv
    }
    
    # Activate virtual environment
    & .\venv\Scripts\Activate.ps1
    
    # Install dependencies
    pip install -r requirements.txt
    pip install pytest pytest-cov pytest-asyncio
    
    # Run tests
    pytest -v --cov=app --cov-report=html --cov-report=term-missing
    
    deactivate
    Set-Location ..
}

# Run frontend tests
function Run-FrontendTests {
    Write-Host "`nRunning frontend tests..." -ForegroundColor Yellow
    Set-Location frontend
    
    # Install dependencies
    npm install
    
    # Run linting
    Write-Host "Running linting..." -ForegroundColor Yellow
    npm run lint
    
    # Run type checking
    Write-Host "Running type checking..." -ForegroundColor Yellow
    npm run type-check
    
    # Run tests
    Write-Host "Running unit tests..." -ForegroundColor Yellow
    npm run test -- --coverage
    
    Set-Location ..
}

# Run integration tests
function Run-IntegrationTests {
    Write-Host "`nRunning integration tests..." -ForegroundColor Yellow
    
    # Start backend in test mode
    Set-Location backend
    & .\venv\Scripts\Activate.ps1
    
    $env:ENVIRONMENT = "test"
    $env:REDIS_URL = "redis://localhost:6379/0"
    $env:SENTRY_DSN = "test"
    
    # Start backend server
    $backend = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" -PassThru
    
    # Wait for backend to start
    Start-Sleep -Seconds 5
    
    # Run integration tests
    pytest tests/integration/ -v -m integration
    
    # Stop backend server
    Stop-Process -Id $backend.Id -Force
    
    deactivate
    Set-Location ..
}

# Run performance benchmarks
function Run-Benchmarks {
    Write-Host "`nRunning performance benchmarks..." -ForegroundColor Yellow
    Set-Location backend
    & .\venv\Scripts\Activate.ps1
    
    pytest tests/benchmarks/ -v -m slow --durations=10
    
    deactivate
    Set-Location ..
}

# Generate coverage report
function Generate-CoverageReport {
    Write-Host "`nGenerating coverage reports..." -ForegroundColor Yellow
    
    # Backend coverage
    if (Test-Path "backend\htmlcov\index.html") {
        Write-Host "Backend coverage report: backend\htmlcov\index.html" -ForegroundColor Green
    }
    
    # Frontend coverage
    if (Test-Path "frontend\coverage\lcov-report\index.html") {
        Write-Host "Frontend coverage report: frontend\coverage\lcov-report\index.html" -ForegroundColor Green
    }
}

# Main execution
$command = $args[0]

Check-Services

switch ($command) {
    "backend" {
        Run-BackendTests
    }
    "frontend" {
        Run-FrontendTests
    }
    "integration" {
        Run-IntegrationTests
    }
    "benchmarks" {
        Run-Benchmarks
    }
    "all" {
        Run-BackendTests
        Run-FrontendTests
        Run-IntegrationTests
        Run-Benchmarks
    }
    default {
        Write-Host "Usage: .\run-tests.ps1 [backend|frontend|integration|benchmarks|all]"
        Write-Host "  backend     - Run backend unit tests"
        Write-Host "  frontend    - Run frontend unit tests"
        Write-Host "  integration - Run integration tests"
        Write-Host "  benchmarks  - Run performance benchmarks"
        Write-Host "  all         - Run all tests"
        exit 1
    }
}

Generate-CoverageReport

Write-Host "`n✓ Tests completed successfully!" -ForegroundColor Green
