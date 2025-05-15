import subprocess
import sys

def run_command(command):
    print(f"Running: {command}")
    subprocess.run(command, shell=True, check=True)

def main():
    # Uninstall current potentially incompatible versions
    run_command("pip uninstall -y fastapi uvicorn starlette")
    
    # Install versions that don't require Rust compilation
    run_command("pip install --no-build-isolation --no-deps fastapi==0.95.2 uvicorn==0.22.0 starlette==0.27.0")
    
    print("Dependency versions updated successfully!")

if __name__ == "__main__":
    main()
