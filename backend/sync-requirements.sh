#!/bin/bash

# Sync requirements.txt with Poetry dependencies
# Run this after updating pyproject.toml to keep CI requirements in sync

echo "Exporting requirements from Poetry..."

# Export production dependencies
poetry export --output requirements.txt --without-hashes --without dev

echo "✅ requirements.txt updated from pyproject.toml"
echo ""
echo "📝 Changes made:"
git diff --no-index requirements.txt.bak requirements.txt || true

echo ""
echo "🚀 Commit the updated requirements.txt to keep CI in sync"