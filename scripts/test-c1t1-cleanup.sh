#!/bin/bash
# Test script for C-1-T1 cleanup validation
# This script runs before and after cleanup to ensure nothing breaks

set -e  # Exit on error

echo "================================================"
echo "C-1-T1 Technical Debt Cleanup Test Suite"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to backend directory
cd /mnt/c/Projects/dexter/backend

# Function to run tests
run_tests() {
    local phase=$1
    echo -e "\n${YELLOW}Running tests - Phase: $phase${NC}"
    
    # 1. Check Python syntax
    echo -e "\n1. Checking Python syntax..."
    if python -m py_compile app/services/integrations/*.py app/models/integrations.py app/routers/integrations.py 2>/dev/null; then
        echo -e "${GREEN}✅ Python syntax check passed${NC}"
    else
        echo -e "${RED}❌ Python syntax errors found${NC}"
        return 1
    fi
    
    # 2. Run type checking on integration modules
    echo -e "\n2. Running type checking..."
    if python -m mypy app/services/integrations/ app/models/integrations.py app/routers/integrations.py --ignore-missing-imports 2>/dev/null; then
        echo -e "${GREEN}✅ Type checking passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Type checking has warnings (expected)${NC}"
    fi
    
    # 3. Run specific integration tests
    echo -e "\n3. Running integration tests..."
    if python -m pytest tests/services/test_integration_service.py -v; then
        echo -e "${GREEN}✅ Integration service tests passed${NC}"
    else
        echo -e "${RED}❌ Integration service tests failed${NC}"
        return 1
    fi
    
    # 4. Check for import errors
    echo -e "\n4. Checking imports..."
    python -c "
import sys
sys.path.insert(0, '.')
try:
    from app.services.integrations import BaseConnector, ConnectorRegistry
    from app.services.integration_service import IntegrationService
    from app.models.integrations import Integration
    print('✅ All imports successful')
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
"
    
    # 5. Run the validation script
    echo -e "\n5. Running validation script..."
    if [ "$phase" == "before" ]; then
        python /mnt/c/Projects/dexter/scripts/validate-c1t1-cleanup.py
    else
        python /mnt/c/Projects/dexter/scripts/validate-c1t1-cleanup.py --after-cleanup
    fi
}

# Main execution
echo -e "\n${YELLOW}Step 1: Pre-cleanup validation${NC}"
echo "================================"
run_tests "before"
BEFORE_STATUS=$?

echo -e "\n${YELLOW}Step 2: Creating backup${NC}"
echo "========================"
mkdir -p /mnt/c/Projects/dexter/scripts/c1t1-backup
cp -r app/services/integrations /mnt/c/Projects/dexter/scripts/c1t1-backup/
cp app/models/integrations.py /mnt/c/Projects/dexter/scripts/c1t1-backup/
cp app/routers/integrations.py /mnt/c/Projects/dexter/scripts/c1t1-backup/
echo -e "${GREEN}✅ Backup created${NC}"

echo -e "\n${YELLOW}Step 3: Running cleanup (dry run)${NC}"
echo "=================================="
python /mnt/c/Projects/dexter/scripts/tech-debt-cleanup-c1t1-final.py --dry-run

echo -e "\n${YELLOW}Step 4: Apply cleanup? (y/n)${NC}"
read -p "Continue with actual cleanup? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Applying cleanup...${NC}"
    python /mnt/c/Projects/dexter/scripts/tech-debt-cleanup-c1t1-final.py --verbose
    
    echo -e "\n${YELLOW}Step 5: Post-cleanup validation${NC}"
    echo "================================"
    run_tests "after"
    AFTER_STATUS=$?
    
    echo -e "\n${YELLOW}Step 6: Summary${NC}"
    echo "==============="
    echo -e "Before cleanup status: $([ $BEFORE_STATUS -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
    echo -e "After cleanup status: $([ $AFTER_STATUS -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
    
    if [ $AFTER_STATUS -ne 0 ]; then
        echo -e "\n${RED}⚠️  Cleanup introduced issues! Check the logs above.${NC}"
        echo -e "${YELLOW}You can restore from backup at: /mnt/c/Projects/dexter/scripts/c1t1-backup/${NC}"
    else
        echo -e "\n${GREEN}✅ Cleanup completed successfully!${NC}"
    fi
else
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
fi

echo -e "\n================================================"
echo "Test suite completed"
echo "================================================"