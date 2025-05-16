"""Test script to check which routes are available"""
from app.main import app

print("Available routes:")
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f"{route.methods} {route.path}")