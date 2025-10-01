"""
Script to start the backend server
"""
import subprocess
import time
import sys

print("Starting backend server...")
proc = subprocess.Popen(
    [sys.executable, "-m", "app.main"],
    cwd="/mnt/c/Projects/Dexter/backend"
)

# Wait for server to start
time.sleep(5)
print("Server should be running on http://localhost:8000")
print("Press Ctrl+C to stop")

try:
    proc.wait()
except KeyboardInterrupt:
    print("\nStopping server...")
    proc.terminate()
    proc.wait()