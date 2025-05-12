"""
Redis stub module that provides dummy implementations of Redis functionality.
This allows the application to run without Redis installed.

Run this script directly to start the server with the stub module in the path.
"""

import sys
import os
import importlib.util
from types import ModuleType


class RedisDummy:
    """Dummy Redis class that implements the basic Redis interface."""
    
    def __init__(self, **kwargs):
        self.data = {}
        print("Redis Dummy initialized")
    
    @classmethod
    def from_url(cls, url, **kwargs):
        """Create a Redis instance from a URL."""
        return cls()
    
    def ping(self):
        """Ping Redis."""
        return True
    
    def get(self, key):
        """Get a key from Redis."""
        return self.data.get(key)
    
    def set(self, key, value, **kwargs):
        """Set a key in Redis."""
        self.data[key] = value
        return True
    
    def setex(self, key, ttl, value):
        """Set a key with expiration in Redis."""
        self.data[key] = value
        return True
    
    def delete(self, *keys):
        """Delete keys from Redis."""
        count = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                count += 1
        return count
    
    def keys(self, pattern):
        """Get keys matching pattern."""
        pattern = pattern.replace('*', '')
        return [k for k in self.data.keys() if pattern in k]


class RedisErrorDummy(Exception):
    """Dummy Redis error."""
    pass


class RedisStubModule(ModuleType):
    """
    A stub module that provides dummy implementations of Redis functionality.
    """
    
    def __init__(self):
        super().__init__("redis")
        self.Redis = RedisDummy
        self.exceptions = type("exceptions", (), {})
        self.exceptions.RedisError = RedisErrorDummy


# Create and install the stub module
redis_stub = RedisStubModule()
sys.modules["redis"] = redis_stub
print("Redis stub module installed")

# Now run the server if this script is executed directly
if __name__ == "__main__":
    import uvicorn
    import subprocess
    
    print("Starting server with Redis stub...")
    
    # Use subprocess to properly handle CTRL+C and other signals
    try:
        subprocess.run(["uvicorn", "app.main:app", "--reload", "--port", "8001"])
    except KeyboardInterrupt:
        print("\nServer stopped")
