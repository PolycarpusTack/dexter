#!/bin/bash
# Comprehensive cleanup script for Dexter project
# This script removes duplicate, backup, and unnecessary files

echo "Starting Dexter project cleanup..."

# Create a backup directory just in case
BACKUP_DIR="/mnt/c/Projects/Dexter/cleanup_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

# Function to backup and then remove a file/directory
backup_and_remove() {
    if [ -e "$1" ]; then
        echo "Backing up and removing: $1"
        cp -R "$1" "$BACKUP_DIR/$(basename "$1")"
        rm -rf "$1"
    fi
}

# 1. Remove archived and backup directories
echo "Removing archived and backup directories..."
backup_and_remove "/mnt/c/Projects/Dexter/frontend/_cleanup_backup"
backup_and_remove "/mnt/c/Projects/Dexter/frontend/src/components/archive-to-delete"
backup_and_remove "/mnt/c/Projects/Dexter/frontend/src/hooks/archive-to-delete"
backup_and_remove "/mnt/c/Projects/Dexter/frontend/src/pages/archive-to-delete"
backup_and_remove "/mnt/c/Projects/Dexter/frontend/src/types/archive-to-delete"
backup_and_remove "/mnt/c/Projects/Dexter/frontend/to_be_deleted"
backup_and_remove "/mnt/c/Projects/Dexter/frontend/src/api/archive-to-delete"
backup_and_remove "/mnt/c/Projects/Dexter/frontend/src/api/archived"

# Remove backup component files
backup_and_remove "/mnt/c/Projects/Dexter/frontend/src/components/Settings/SettingsInput-backup.tsx"

# 2. Remove redundant main_*_shim.py files (keeping the actual main files for different modes)
echo "Removing redundant shim files..."
backup_and_remove "/mnt/c/Projects/Dexter/backend/app/main_debug_shim.py"
backup_and_remove "/mnt/c/Projects/Dexter/backend/app/main_enhanced_shim.py"
backup_and_remove "/mnt/c/Projects/Dexter/backend/app/main_minimal_shim.py"
backup_and_remove "/mnt/c/Projects/Dexter/backend/app/main_simplified_shim.py"

# 3. Remove duplicate documentation files
echo "Removing duplicate documentation files..."
backup_and_remove "/mnt/c/Projects/Dexter/CLEANUP_SUMMARY.md"
backup_and_remove "/mnt/c/Projects/Dexter/FIXES-SUMMARY.md"
backup_and_remove "/mnt/c/Projects/Dexter/FIXES_SUMMARY.md"
# Keep the latest status update, remove older ones
backup_and_remove "/mnt/c/Projects/Dexter/PROJECT-STATUS-UPDATE.md"
backup_and_remove "/mnt/c/Projects/Dexter/PROJECT-STATUS-UPDATE-MAY-18.md"

# 4. Remove duplicate batch files, keeping only the essential ones
echo "Removing redundant batch files..."
# Keep only the main setup and run scripts
backup_and_remove "/mnt/c/Projects/Dexter/backend/fix_missing_dependencies.bat"
backup_and_remove "/mnt/c/Projects/Dexter/backend/run_backend_with_fixed_deps.bat"
backup_and_remove "/mnt/c/Projects/Dexter/backend/setup_migration.bat"
backup_and_remove "/mnt/c/Projects/Dexter/backend/verify_migration.bat"
backup_and_remove "/mnt/c/Projects/Dexter/backend/install_pydantic_settings.bat"

# 5. Clean up redundant Python scripts in backend
echo "Cleaning up redundant Python scripts..."
backup_and_remove "/mnt/c/Projects/Dexter/backend/fix_pydantic_settings_direct.py"
backup_and_remove "/mnt/c/Projects/Dexter/backend/fix_dependencies2.py"
backup_and_remove "/mnt/c/Projects/Dexter/backend/simple_cleanup.py"
backup_and_remove "/mnt/c/Projects/Dexter/backend/comprehensive_cleanup.py"
backup_and_remove "/mnt/c/Projects/Dexter/backend/clean_code.py"

# 6. Clean up duplicate requirements files, keeping the main one
echo "Cleaning up duplicate requirements files..."
if [ -f "/mnt/c/Projects/Dexter/backend/requirements.txt" ]; then
    backup_and_remove "/mnt/c/Projects/Dexter/backend/requirements-fixed.txt"
fi

echo "Cleanup completed successfully!"
echo "Backup of removed files stored in: $BACKUP_DIR"
echo "If you need to restore any files, you can find them in the backup directory."

# Print summary statistics
echo -e "\nCleanup Summary:"
REMOVED_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)
DIR_COUNT=$(find "$BACKUP_DIR" -type d | wc -l)
echo "Removed $REMOVED_COUNT files and $(($DIR_COUNT - 1)) directories"
echo "Saved approximately $(du -sh "$BACKUP_DIR" | awk '{print $1}') of disk space"