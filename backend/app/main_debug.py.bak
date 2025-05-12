"""
Debug version of the main application file.
This will help diagnose import issues.
"""

import sys
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

try:
    logger.debug("Importing core.settings...")
    from app.core.settings import settings
    logger.debug(f"Settings imported successfully: {settings}")
    
    logger.debug("Importing FastAPI...")
    from fastapi import FastAPI
    
    logger.debug("Creating FastAPI app...")
    app = FastAPI(title="Dexter API (Debug Mode)")
    
    @app.get("/")
    async def root():
        return {"message": "Dexter API is running in debug mode"}
    
    logger.debug("Debug app setup complete")
    
except Exception as e:
    logger.error(f"Error during initialization: {str(e)}")
    logger.error(traceback.format_exc())
    sys.exit(1)

# This should only run when this file is executed directly
if __name__ == "__main__":
    import uvicorn
    logger.debug("Starting Uvicorn server...")
    uvicorn.run("app.main_debug:app", host="127.0.0.1", port=8001, reload=True)
