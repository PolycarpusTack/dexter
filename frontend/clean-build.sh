#!/bin/bash

echo "Cleaning build artifacts..."

# Remove build directories
rm -rf dist/
rm -rf node_modules/.vite/

# Clear package manager caches
npm cache clean --force

echo "Clean complete. Ready for fresh build."
echo "Run 'npm run build' to build the project."