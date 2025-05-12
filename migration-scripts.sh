#!/bin/bash
# Set of migration scripts to help with the Dexter TypeScript consolidation

# Set the project root directory
PROJECT_ROOT="C:/Projects/Dexter"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
SRC_DIR="$FRONTEND_DIR/src"

# Color codes for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Find all references to appStore with extensions in imports
find_appstore_refs() {
  echo -e "${BLUE}Finding all references to appStore imports with extensions...${NC}"
  
  # Find all JS/TS/JSX/TSX files referencing appStore with extensions
  grep -r "from '.*appStore\.\(js\|jsx\|ts\|tsx\)'" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" || echo "No references found"
  
  echo -e "${BLUE}Done.${NC}"
}

# 2. Find all references to theme with extensions in imports
find_theme_refs() {
  echo -e "${BLUE}Finding all references to theme imports with extensions...${NC}"
  
  # Find all JS/TS/JSX/TSX files referencing theme with extensions
  grep -r "from '.*theme/theme\.\(js\|jsx\|ts\|tsx\)'" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" || echo "No references found"
  
  echo -e "${BLUE}Done.${NC}"
}

# 3. Update all appStore imports (using sed)
update_appstore_imports() {
  echo -e "${YELLOW}This will update all appStore imports to remove file extensions.${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Updating appStore imports...${NC}"
    
    # Use sed to replace imports with extensions to extensionless imports
    find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec \
      sed -i 's/from \([\x27"]\).*\/appStore\.\(js\|jsx\|ts\|tsx\)\([\x27"]\)/from \1..\/store\/appStore\3/g' {} \;
    
    echo -e "${GREEN}AppStore imports updated!${NC}"
  else
    echo -e "${RED}Operation cancelled.${NC}"
  fi
}

# 4. Update all theme imports (using sed)
update_theme_imports() {
  echo -e "${YELLOW}This will update all theme imports to remove file extensions.${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Updating theme imports...${NC}"
    
    # Use sed to replace imports with extensions to extensionless imports
    find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec \
      sed -i 's/from \([\x27"]\).*\/theme\/theme\.\(js\|jsx\|ts\|tsx\)\([\x27"]\)/from \1..\/theme\/theme\3/g' {} \;
    
    echo -e "${GREEN}Theme imports updated!${NC}"
  else
    echo -e "${RED}Operation cancelled.${NC}"
  fi
}

# 5. Backup the old files before removing them
backup_old_files() {
  echo -e "${BLUE}Creating backup of old files...${NC}"
  
  # Create backup directory
  BACKUP_DIR="$FRONTEND_DIR/backup_$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$BACKUP_DIR/store"
  mkdir -p "$BACKUP_DIR/theme"
  
  # Copy the files to backup
  cp "$SRC_DIR/store/appStore.js" "$BACKUP_DIR/store/" 2>/dev/null || echo "appStore.js not found"
  cp "$SRC_DIR/store/appStore.jsx" "$BACKUP_DIR/store/" 2>/dev/null || echo "appStore.jsx not found"
  cp "$SRC_DIR/theme/theme.js" "$BACKUP_DIR/theme/" 2>/dev/null || echo "theme.js not found"
  
  echo -e "${GREEN}Backup created at $BACKUP_DIR${NC}"
}

# 6. Remove the old files
remove_old_files() {
  echo -e "${YELLOW}This will remove the old .js and .jsx versions of appStore and theme.${NC}"
  echo -e "${RED}Make sure you have backed up these files first!${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Removing old files...${NC}"
    
    # Remove the old files
    rm -f "$SRC_DIR/store/appStore.js" "$SRC_DIR/store/appStore.jsx" "$SRC_DIR/theme/theme.js"
    
    echo -e "${GREEN}Old files removed!${NC}"
  else
    echo -e "${RED}Operation cancelled.${NC}"
  fi
}

# 7. Verify import consistency
verify_imports() {
  echo -e "${BLUE}Verifying import consistency...${NC}"
  
  # Check for remaining problematic imports
  APPSTORE_REFS=$(grep -r "from '.*appStore\.\(js\|jsx\|ts\|tsx\)'" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" | wc -l)
  THEME_REFS=$(grep -r "from '.*theme/theme\.\(js\|jsx\|ts\|tsx\)'" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" | wc -l)
  
  if [ "$APPSTORE_REFS" -eq 0 ] && [ "$THEME_REFS" -eq 0 ]; then
    echo -e "${GREEN}All imports are consistent!${NC}"
  else
    echo -e "${RED}Found $APPSTORE_REFS appStore imports and $THEME_REFS theme imports with extensions.${NC}"
    echo -e "${YELLOW}Run find_appstore_refs and find_theme_refs to see where they are.${NC}"
  fi
}

# 8. Run integration tests
run_integration_tests() {
  echo -e "${BLUE}Running integration tests to verify consolidation...${NC}"
  
  # Navigate to the frontend directory
  cd "$FRONTEND_DIR"
  
  # Run tests related to appStore and theme
  npm test -- --testPathPattern="store|theme"
  
  # Return status
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
  else
    echo -e "${RED}Some tests failed. Please review the test output.${NC}"
  fi
}

# 9. Check for property mapping issues (appStore.jsx -> appStore.ts)
check_property_mappings() {
  echo -e "${BLUE}Checking for potential property mapping issues...${NC}"
  
  # Common property name changes
  echo -e "${YELLOW}Searching for references to 'issueStatusFilter' (should be 'statusFilter')...${NC}"
  grep -r "issueStatusFilter" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" || echo "No references found"
  
  echo -e "${YELLOW}Searching for references to 'issueSearchTerm' (should be 'searchQuery')...${NC}"
  grep -r "issueSearchTerm" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" || echo "No references found"
  
  echo -e "${YELLOW}Searching for references to 'setIssueStatusFilter' (should be 'setStatusFilter')...${NC}"
  grep -r "setIssueStatusFilter" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" || echo "No references found"
  
  echo -e "${YELLOW}Searching for references to 'setIssueSearchTerm' (should be 'setSearchQuery')...${NC}"
  grep -r "setIssueSearchTerm" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" "$SRC_DIR" || echo "No references found"
  
  echo -e "${BLUE}Done. If you found references, update them to use the new property names.${NC}"
}

# 10. Update property mappings
update_property_mappings() {
  echo -e "${YELLOW}This will update property names from .jsx version to .ts version.${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Updating property mappings...${NC}"
    
    # Replace common property names
    find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec \
      sed -i 's/issueStatusFilter/statusFilter/g' {} \;
    
    find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec \
      sed -i 's/issueSearchTerm/searchQuery/g' {} \;
    
    find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec \
      sed -i 's/setIssueStatusFilter/setStatusFilter/g' {} \;
    
    find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec \
      sed -i 's/setIssueSearchTerm/setSearchQuery/g' {} \;
    
    echo -e "${GREEN}Property mappings updated!${NC}"
  else
    echo -e "${RED}Operation cancelled.${NC}"
  fi
}

# 11. Full migration process
full_migration() {
  echo -e "${YELLOW}This will perform the full migration process:${NC}"
  echo "1. Backup old files"
  echo "2. Update appStore.ts with consolidated features"
  echo "3. Update theme.ts with consolidated features"
  echo "4. Update all imports"
  echo "5. Update property mappings"
  echo "6. Run integration tests"
  echo "7. Verify imports"
  echo -e "${RED}Please make sure you have committed your changes before proceeding.${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Starting full migration process...${NC}"
    
    # Step 1: Backup
    backup_old_files
    
    # Step 2 & 3: Update files
    echo -e "${BLUE}Copy your updated appStore.ts and theme.ts files to:${NC}"
    echo "$SRC_DIR/store/appStore.ts"
    echo "$SRC_DIR/theme/theme.ts"
    read -p "Press Enter when you've updated the files..." -r
    
    # Step 4: Update imports
    update_appstore_imports
    update_theme_imports
    
    # Step 5: Update property mappings
    update_property_mappings
    
    # Step 6: Run tests
    run_integration_tests
    
    # Step 7: Verify
    verify_imports
    
    echo -e "${GREEN}Migration process completed!${NC}"
    echo -e "${YELLOW}Please manually verify your application is working correctly.${NC}"
    echo -e "${YELLOW}If everything is working, you can remove the old files with 'remove_old_files'.${NC}"
  else
    echo -e "${RED}Migration cancelled.${NC}"
  fi
}

# Help text
show_help() {
  echo -e "${BLUE}Dexter TypeScript Consolidation Helper${NC}"
  echo "This script helps you consolidate the state management store and theme files."
  echo ""
  echo "Available commands:"
  echo "  find_appstore_refs     - Find all references to appStore with extensions"
  echo "  find_theme_refs        - Find all references to theme with extensions"
  echo "  update_appstore_imports - Update all appStore imports to remove extensions"
  echo "  update_theme_imports   - Update all theme imports to remove extensions"
  echo "  backup_old_files       - Backup the old .js and .jsx files"
  echo "  remove_old_files       - Remove the old .js and .jsx files"
  echo "  verify_imports         - Verify import consistency"
  echo "  run_integration_tests  - Run integration tests"
  echo "  check_property_mappings - Check for property name mismatches"
  echo "  update_property_mappings - Update property names from .jsx to .ts version"
  echo "  full_migration         - Run the full migration process"
  echo "  help                   - Show this help text"
  echo ""
  echo "Example usage:"
  echo "  ./migration-scripts.sh find_appstore_refs"
}

# Main execution
case "$1" in
  find_appstore_refs)
    find_appstore_refs
    ;;
  find_theme_refs)
    find_theme_refs
    ;;
  update_appstore_imports)
    update_appstore_imports
    ;;
  update_theme_imports)
    update_theme_imports
    ;;
  backup_old_files)
    backup_old_files
    ;;
  remove_old_files)
    remove_old_files
    ;;
  verify_imports)
    verify_imports
    ;;
  run_integration_tests)
    run_integration_tests
    ;;
  check_property_mappings)
    check_property_mappings
    ;;
  update_property_mappings)
    update_property_mappings
    ;;
  full_migration)
    full_migration
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    show_help
    exit 1
    ;;
esac