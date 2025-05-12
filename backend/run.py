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
    
    # Set environment variable
    os.environ["APP_MODE"] = mode
    print(f"Starting Dexter in {mode} mode...")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
