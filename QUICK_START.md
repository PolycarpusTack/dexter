# Dexter Quick Start Guide

This guide provides the fastest way to get Dexter up and running on your local machine.

## Prerequisites

Ensure you have the following installed:
- Python 3.10-3.12 (3.12 recommended)
- Node.js (LTS version)
- Ollama (for AI features)
- Sentry account with API token

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Dexter
```

## Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
# Copy the example .env file and edit it with your Sentry API token
copy .env.example .env  # On Windows
# cp .env.example .env  # On macOS/Linux

# Edit the .env file with your favorite editor to add:
# - SENTRY_API_TOKEN
# - SENTRY_ORG_SLUG
# - SENTRY_PROJECT_SLUG
```

## Step 3: Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

## Step 4: Start the Servers

### Terminal 1: Start Ollama (if not already running)
```bash
ollama serve
```

### Terminal 2: Start Backend
```bash
cd backend
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On macOS/Linux
uvicorn app.main:app --reload --port 8000
```

### Terminal 3: Start Frontend
```bash
cd frontend
npm run dev
```

## Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Common Issues and Solutions

### Backend Issues

- **Missing module uvicorn**: Make sure you're running the server from the activated virtual environment
  ```bash
  venv\Scripts\activate
  pip install uvicorn[standard]
  ```

- **Python version compatibility**: Use Python 3.12 for best results

### Frontend Issues

- **ESM/CommonJS compatibility errors**: Try running the fix script
  ```bash
  cd frontend
  npm run fix-build
  ```

- **Port conflicts**: Use a different port if 5173 is taken
  ```bash
  npm run dev -- --port 5174
  ```

## Quick Verification

Once both servers are running, go to the application URL and:

1. Verify that the connection to the backend is working (check Settings panel)
2. Verify that Sentry integration is working (issues should load)
3. Verify that Ollama integration is working (try the "Explain with AI" feature)

## Next Steps

- Review the README.md for detailed information
- Explore the docs/ directory for comprehensive documentation
- Read DEVELOPMENT_GUIDE.md for development workflows

## Support

If you encounter any issues, please:
1. Check the TROUBLESHOOTING.md file
2. Review the full documentation in the docs/final/ directory
3. Submit an issue on GitHub with detailed information about your problem