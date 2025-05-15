import subprocess
import sys

def run_command(command):
    print(f"Running: {command}")
    subprocess.run(command, shell=True, check=True)

def main():
    # Uninstall current potentially incompatible versions
    run_command("pip uninstall -y fastapi uvicorn pydantic starlette")
    
    # Install versions known to work better with Python 3.13
    run_command("pip install fastapi==0.103.1 uvicorn==0.23.2 pydantic==2.3.0 starlette==0.27.0")
    
    print("Dependency versions updated successfully!")

if __name__ == "__main__":
    main()
