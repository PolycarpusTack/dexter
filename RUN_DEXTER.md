# Running Dexter: Backend and Frontend

This guide provides steps to start the Dexter application after applying the necessary fixes.

## Prerequisites

- Python 3.10-3.12 (Python 3.13 requires special compatibility scripts)
- Node.js (LTS version)
- npm

## Starting the Backend

1. **Setup Python Environment**:
   ```bash
   cd backend
   
   # Create a virtual environment
   python -m venv venv
   
   # Activate the virtual environment
   # On Windows:
   venv\Scripts\activate
   # On Linux/Mac:
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Run the Backend Server**:
   ```bash
   # Regular mode
   python -m app.main
   
   # Or with a specific mode
   set APP_MODE=debug && python -m app.main
   set APP_MODE=minimal && python -m app.main
   set APP_MODE=enhanced && python -m app.main
   set APP_MODE=simplified && python -m app.main
   ```

   The backend server will start on port 8000 by default.

## Starting the Frontend

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run the Frontend Development Server**:
   ```bash
   npm run dev
   ```

   The frontend development server will start on port 5173 by default.

3. **If You Encounter Dependency Issues**:
   Run the dependency fix script:
   ```bash
   ./fix-frontend-deps.sh
   ```

## Testing the Application

1. **Open the Application**:
   Navigate to http://localhost:5173 in your web browser.

2. **Default Credentials**:
   No login is required for the default configuration.

3. **Check Backend Connectivity**:
   The frontend should automatically connect to the backend at http://localhost:8000.

## Common Issues and Solutions

### Python 3.13 Compatibility
If you're using Python 3.13, use the compatibility scripts in the `backend` directory:
```bash
cd backend
python fix_pydantic_compatibility.py
python -m app.main
```

### Frontend ESM/CommonJS Issues
If you encounter module compatibility issues:
1. Check that the React Query version is compatible with your code
2. Use the fix-frontend-deps.sh script to install compatible versions

### CORS Issues
If you encounter CORS errors:
1. Ensure the backend is configured to allow requests from the frontend origin
2. The backend has been configured to allow requests from http://localhost:5173 and http://localhost:3000

## Configuration

- Backend configuration is in `/backend/app/core/settings.py` and various YAML files in `/backend/config/`
- Frontend configuration is in `/frontend/src/api/unified/apiConfig.ts`

For more details, check the extensive documentation in the `/docs/consolidated/` directory.