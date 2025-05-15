#!/bin/bash

# Script to update the repository for Python 3.13 compatibility

echo "Updating repository for Python 3.13 compatibility..."

# First, fix the Pydantic compatibility issues
echo "Step 1: Fixing Pydantic compatibility issues..."
python3 fix_pydantic_compatibility.py

# Then, fix the FastAPI issues for Python 3.13
echo "Step 2: Fixing FastAPI for Python 3.13..."
python3 fix_fastapi_py313.py

# Fix pydantic-settings compatibility
echo "Step 3: Fixing pydantic-settings compatibility..."
python3 fix_pydantic_settings.py

# Install the required dependencies
echo "Step 4: Installing compatible dependencies..."
pip install -r requirements-fixed.txt

echo "Update complete!"
echo "Please check python313_compatibility.md for additional information."