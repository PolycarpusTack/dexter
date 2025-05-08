# Dexter - Sentry Observability Companion

Dexter is an intelligent companion tool designed to enhance your Sentry.io experience. It provides a user-friendly interface to explore Sentry issues, leverage AI for error explanations, and perform enhanced error analysis, making observability more accessible and actionable across different roles.

## ✨ Key Features

### Core Features

* **Intuitive Event Explorer:**
    * View Sentry issues with advanced sorting and filtering
    * Filter issues by status (`unresolved`, `resolved`, `ignored`, `all`)
    * Search issues by keywords
    * Paginate through issue lists
    * Multi-select issues for bulk actions

* **Visual Decision Indicators:**
    * Event frequency sparklines showing trends over time
    * User impact visualizations with percentage of affected users
    * Color-coded impact levels (critical, high, medium, low)
    * Priority scoring based on frequency and impact

* **Enhanced Event Details:**
    * Comprehensive event information with PII protection
    * Release information and deployment context
    * Interactive stack trace navigation
    * Timeline view for breadcrumbs
    * Contextual data with privacy controls

* **AI-Powered Analysis:**
    * Plain-language explanations for errors using LLM integration
    * Context-aware prompting for better explanations
    * Support for multiple AI models via Ollama
    * Response formatting and presentation options

* **PostgreSQL Deadlock Analyzer:**
    * Specialized visualization for PostgreSQL deadlocks
    * Analysis of deadlock patterns and root causes
    * Transaction and process relationship mapping
    * Recommended resolution strategies

* **Workflow Integration:**
    * Resolve or ignore issues directly within Dexter
    * Bulk actions for multiple selected issues
    * Quick links to Sentry for deeper investigation
    * Export options for sharing and reporting

### Technical Features

* **Robust Architecture:**
    * Modular component design for maintainability
    * Error boundaries for isolated component failures
    * Performance optimizations for large datasets
    * Accessibility enhancements for all users

* **Data Security:**
    * PII masking and data privacy controls
    * Sensitive information protection
    * Compliance with security best practices
    * User control over data visibility

* **Enhanced Visualization:**
    * D3.js integration for advanced data visualization
    * Responsive and interactive charts
    * Tooltips with detailed contextual information
    * Consistent design language across visualizations

## 🛠️ Tech Stack

* **Backend:**
    * Python 3.10+
    * FastAPI (for REST API)
    * Pydantic (for data validation & settings)
    * Uvicorn (ASGI server)
    * HTTPX (async HTTP client for Sentry/Ollama)
    * Cachetools (for in-memory caching)
* **Frontend:**
    * Node.js (LTS version)
    * React (with Vite for building)
    * JavaScript (ES6+)
    * Mantine UI (component library & styling)
    * TanStack Query (React Query) (data fetching & server state)
    * Zustand (global UI state)
    * Axios (HTTP client for calling Dexter backend)
    * D3.js (for data visualization)
    * `@mantine/notifications` (for UI feedback)
* **AI Integration:**
    * Ollama (running locally with a compatible model like Mistral, Llama3, etc.)
* **Package Management:**
    * Poetry (Backend)
    * npm (Frontend)
* **Containerization (Optional):**
    * Docker (Dockerfiles provided for backend and frontend)

##  Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Python:** Version 3.10 or higher.
2.  **Poetry:** Python dependency and packaging manager. ([Installation Guide](https://python-poetry.org/docs/#installation)).
3.  **Node.js:** LTS (Long Term Support) version is recommended (e.g., v18, v20). This includes `npm`. ([Download Page](https://nodejs.org/)).
4.  **Git:** For cloning the repository (if applicable).
5.  **Ollama:** Must be installed and running locally. ([Download Page](https://ollama.com/)).
    * After installing Ollama, pull the language model you intend to use (the backend defaults to `mistral:latest` but can be changed via `.env`):
        ```bash
        ollama pull mistral
        # or, for example:
        # ollama pull llama3
        ```
6.  **Sentry Account & API Token:**
    * You need an active Sentry account.
    * Create an **Internal Integration** in Sentry for Dexter.
    * Generate an **API Token** for this integration. This token needs permissions like:
        * `project:read` (to read issues, events, projects)
        * `event:read` (to read event details)
        * `org:read` (to read organization details, potentially list projects/orgs for selectors later)
        * `project:write` (to update issue status like resolve/ignore) - *or `issue:write` if available and more granular.*

## ⚙️ Setup Instructions

1.  **Clone the Repository (if applicable):**
    ```bash
    git clone <your-dexter-repository-url>
    cd dexter
    ```
    If you have the files locally, navigate to the root `dexter/` directory.

2.  **Backend Setup:**
    * Navigate to the backend directory:
        ```bash
        cd backend
        ```
    * Create your environment configuration file by copying the example:
        ```bash
        cp .env.example .env
        ```
    * **Edit the `.env` file** using a text editor (e.g., `nano .env`, `vim .env`, or VS Code):
        * **Crucially, set `SENTRY_API_TOKEN`** to the token you generated in Sentry.
        * Verify `SENTRY_BASE_URL` if you use a self-hosted Sentry instance (default is `https://sentry.io/api/0/`).
        * Verify `SENTRY_WEB_URL` if you use a self-hosted Sentry instance (default is `https://sentry.io/`). This is used for "View in Sentry" links.
        * Verify `OLLAMA_BASE_URL` (default is `http://localhost:11434`).
        * Verify `OLLAMA_MODEL` matches a model you have pulled in Ollama (default is `mistral:latest`).
        * Adjust `LOG_LEVEL` if needed (e.g., `DEBUG` for more verbose logs).
    * Install backend dependencies using Poetry:
        ```bash
        poetry install
        ```
        *(This creates a virtual environment and installs packages. It might take a few minutes on the first run.)*

3.  **Frontend Setup:**
    * Navigate to the frontend directory (from the root `dexter/` directory):
        ```bash
        cd frontend
        ```
    * Install frontend dependencies using npm:
        ```bash
        npm install
        ```
    * **(Optional) Frontend Environment Variables:** If you need to customize the frontend's default API endpoint or other build-time variables, you can create a `.env.development` (for dev server) or `.env.production` (for builds) file in the `frontend` directory. For example:
        ```dotenv
        # frontend/.env.development
        VITE_API_BASE_URL=http://localhost:8000/api/v1
        VITE_SENTRY_WEB_URL=https://sentry.io
        ```

## 🚀 Running the Application

You need to have three main components running simultaneously: Ollama, the Dexter Backend, and the Dexter Frontend.

1.  **Start Ollama:**
    * Ensure your Ollama application is running. If you installed it as a desktop app, it might already be running in the background.
    * If you use the CLI version, you might need to run `ollama serve` in a separate terminal.
    * Verify the model specified in `backend/.env` (e.g., `mistral:latest`) is available (`ollama list`).

2.  **Run the Dexter Backend Server:**
    * Open a new terminal.
    * Navigate to the `backend` directory: `cd path/to/dexter/backend`
    * Activate the Poetry virtual environment:
        ```bash
        poetry shell
        ```
        *(Your terminal prompt should change, indicating the virtual environment is active).*
    * Start the FastAPI server using Uvicorn:
        ```bash
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
        ```
        * `--reload`: Enables auto-reloading on code changes (for development).
        * `--host 0.0.0.0`: Makes the server accessible from your local network (or use `localhost`).
        * `--port 8000`: The port the backend will listen on.
    * Keep this terminal window open. You should see logs indicating the server is running (e.g., `Uvicorn running on http://0.0.0.0:8000`).

3.  **Run the Dexter Frontend Development Server:**
    * Open *another new* terminal window.
    * Navigate to the `frontend` directory: `cd path/to/dexter/frontend`
    * Start the React development server (Vite):
        ```bash
        npm run dev
        ```
    * Vite will compile the frontend and start a dev server, usually on `http://localhost:5173`. It will show the URL in the terminal.
    * Keep this terminal window open.

4.  **Access Dexter:**
    * Open your web browser (e.g., Chrome, Firefox, Edge).
    * Navigate to the frontend URL (usually `http://localhost:5173`).

## 📖 Basic Usage Guide

1.  Upon opening Dexter, you'll see the main dashboard layout.
2.  **Configuration:**
    * The "Settings" panel (likely in the left navbar) will show the status of the backend (Sentry token, Ollama connection).
    * If the Sentry token is missing in the backend `.env` or Ollama is not reachable, it will be indicated here.
    * Enter your **Sentry Organization Slug** and **Sentry Project Slug** into the input fields.
    * Click "Save & Reload Issues". The issue list should then populate.
3.  **Event Explorer:**
    * The main table lists Sentry issues with event frequency and user impact visualizations.
    * Use the **Status Filter** to change the view.
    * Use the **Sort Options** to sort by different criteria (date, priority, frequency, impact).
    * Use the **Search Input** to filter issues by keywords.
    * **Select multiple issues** by clicking the checkbox on each row.
    * Use the **Bulk Action Bar** to perform actions on multiple selected issues.
    * Click the **More Options** menu on each row for additional actions.
4.  **Event Details:**
    * Click on any row in the table to load its details in the right-hand panel.
    * The detail panel shows:
        * Title, level, tags, timestamp, platform, and other metadata.
        * Release information (if available).
        * "Resolve" and "Ignore" buttons to update the issue's status.
        * Sections for Stack Trace, Breadcrumbs, Context Data, and HTTP Request details.
        * Data privacy controls to mask sensitive information.
5.  **AI Explanation:**
    * In the Event Detail panel, click the "Explain with AI" button.
    * Dexter will send context to your local Ollama instance and display the generated explanation.
    * You can change the AI model from the settings panel.
6.  **PostgreSQL Deadlock Analysis (for deadlock errors):**
    * When a PostgreSQL deadlock error is detected, Dexter will automatically show the deadlock analyzer.
    * Explore the visual representation of the deadlock.
    * See tables involved and transaction details.
    * Review recommended resolution strategies.

## 📈 Visualization Features

### Sparkline Charts

Event frequency sparklines show:
- Trends over time (24h, 7d, 30d)
- Percentage change indicators
- Peak detection for unusual activity
- Interactive tooltips with detailed information

### User Impact Visualization

The user impact visualization shows:
- Number of affected users
- Percentage of total user base affected
- Color-coded impact levels
- Detailed breakdown of affected user segments

### Timeline View

The breadcrumbs timeline shows:
- Chronological sequence of events leading to the error
- Color-coded severity levels
- Interactive expanding sections for detailed data
- Timestamp information

## 🚀 Next Steps & Future Development

Upcoming features and enhancements include:

- **Smart Grouping Algorithm**: Automatically group similar issues by root cause patterns
- **AI-Generated Summaries**: Concise one-line problem statements for each issue
- **Geographic Impact Maps**: Visual representation of affected user locations
- **Service Dependency Visualization**: Graph view of service relationships in distributed errors
- **Timeline View with Deployment Markers**: Connect errors to specific deployments
- **Collaborative Features**: @mentions, comments, and shared investigation sessions

## 📄 License

[Your License Information Here]
