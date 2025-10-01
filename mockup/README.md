# Dexter Mock-up

This is a functional mock-up of the Dexter application - an intelligent companion tool for Sentry.io that provides AI-powered error analysis.

## Features Demonstrated

1. **Issues Dashboard**: Browse and search Sentry issues with visual indicators
2. **AI Error Explanation**: Get AI-powered explanations for errors
3. **Responsive UI**: Built with React and Mantine UI components
4. **Mock API**: FastAPI backend with sample data

## Quick Start

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd mockup/backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```bash
   python main.py
   ```

   The API will be available at http://localhost:8000

### Frontend Setup

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd mockup/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The application will be available at http://localhost:3000

## Mock Data

The mock-up includes sample data for:
- 3 different types of errors (TypeError, DatabaseError, N+1 Query)
- AI explanations for each error type
- Issue metadata (occurrence count, affected users, etc.)

## Key Components

### Backend (`/mockup/backend/main.py`)
- FastAPI application with CORS enabled
- Mock endpoints for issues, events, and AI analysis
- Health check endpoint

### Frontend (`/mockup/frontend/src/App.tsx`)
- React application with TypeScript
- Mantine UI for components
- Issue cards with AI explanation feature
- Search functionality
- Modal for detailed error analysis

## API Endpoints

- `GET /api/issues` - List all issues
- `GET /api/issues/{id}` - Get specific issue
- `POST /api/ai/explain` - Get AI explanation for an error
- `GET /api/health` - Health check

## Notes

This is a simplified mock-up that demonstrates the core concepts of Dexter. The full application includes many more features such as:
- Real Sentry integration
- Multiple AI model support (Ollama, OpenAI, Anthropic)
- Advanced analyzers (Deadlock, Memory Leak, N+1 Query)
- WebSocket support for real-time updates
- Authentication and authorization
- Comprehensive monitoring and metrics