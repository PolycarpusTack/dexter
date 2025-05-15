#!/usr/bin/env python
"""
Development server runner for Dexter backend.
"""
import os
import sys
import uvicorn

if __name__ == "__main__":
    # Get mode from command line arguments if provided
    mode = "default"
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    
    # Set environment variables for development
    os.environ["APP_MODE"] = mode
    os.environ["DEBUG"] = "true"  # Enable debug mode for development
    print(f"Starting Dexter in {mode} mode (debug enabled)...")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
