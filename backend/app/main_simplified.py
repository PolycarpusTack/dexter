"""
Deprecated: Shim for backward compatibility with main_simplified.py
"""
import os
import warnings

warnings.warn(
    "main_simplified.py is deprecated and will be removed in a future version. "
    "Please use 'APP_MODE=simplified python -m app.main' instead.",
    DeprecationWarning,
    stacklevel=2
)

# Set environment variable for mode
os.environ["APP_MODE"] = "simplified"

# Import the app from main (now updated)
from app.main import app

# Keep this for backwards compatibility
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main_simplified:app", host="0.0.0.0", port=8000)
