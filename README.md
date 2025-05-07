# Dexter - Sentry Observability Companion (MVP)

Dexter is an intelligent companion tool designed to enhance your Sentry.io experience. It provides a user-friendly interface to explore Sentry issues, leverage AI for error explanations, and perform basic issue management, making observability more accessible and actionable across different roles.

This MVP focuses on laying a robust foundation with core features, built with best practices in mind for future scalability.

## ✨ Key Features (MVP)

* **Intuitive Event Explorer:**
    * View Sentry issues for a configured project.
    * Filter issues by status (`unresolved`, `resolved`, `ignored`, `all`) via backend Sentry queries.
    * Search issues (current implementation filters based on title and other Sentry-searchable fields via backend query).
    * Paginate through issue lists.
* **Detailed Event Views:**
    * Display comprehensive event details including title, level, tags, timestamp, platform.
    * Render formatted stack traces, context data (user, browser, OS, device, custom), and breadcrumbs.
* **AI-Powered Explanations:**
    * Get plain-language explanations for errors using a local LLM (via Ollama).
* **Direct Sentry Links:**
    * Quickly navigate from Dexter to the corresponding issue or event page in your Sentry UI.
* **Configuration Management:**
    * Set target Sentry organization and project slugs via the UI.
    * Backend status check for Sentry API token and Ollama connectivity.
* **Data Export:**
    * Export the currently filtered list of issues to CSV or JSON formats.
* **Basic Issue Actions:**
    * Resolve or Ignore Sentry issues directly from Dexter, with UI feedback via notifications.
* **Robust Frontend Data Handling:**
    * Uses TanStack Query (React Query) for efficient data fetching, caching, and server state synchronization.
    * Uses Zustand for minimal global UI state management.
* **Hardened Backend:**
    * FastAPI backend with Pydantic data validation.
    * Basic caching for Sentry API calls.
    * Improved error handling and structured logging.
* **(Deferred for MVP):** Detailed PostgreSQL Deadlock Analyzer visualization (backend parsing logic requires specific Sentry event examples).

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
        VITE_SENTRY_WEB_URL=[https://sentry.io](https://sentry.io)
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
3.  **Event Explorer (`EventTable`):**
    * The main table lists Sentry issues.
    * Use the **Status Filter** (`Unresolved`, `Resolved`, `Ignored`, `All`) to change the view.
    * Use the **Search Input** and click "Search" to filter issues by keywords (this queries Sentry).
    * Use the **Pagination Buttons** ("Previous", "Next") below the table to navigate through more issues.
    * Click the **external link icon** next to an issue's `shortId` to open that issue directly in Sentry.
    * Use the **Export Button** (select CSV or JSON) to download the current view of issues.
4.  **Event Details (`EventDetail`):**
    * Click on any row in the `EventTable` to load its details in the right-hand panel.
    * The detail panel shows:
        * Title, level, tags, timestamp, platform.
        * Links to view the event or issue group in Sentry.
        * "Resolve" and "Ignore" buttons to update the issue's status in Sentry (success/error notifications will appear).
        * An "Explain with AI" button.
        * An accordion with sections for **Stack Trace**, **Breadcrumbs**, **Context Data** (User, Browser, OS, Device, other custom contexts), and **HTTP Request** details (if present).
5.  **AI Explanation (`ExplainError`):**
    * In the `EventDetail` panel, click the "Explain with AI" button.
    * Dexter will send context to your local Ollama instance and display the generated explanation. Loading states and notifications will indicate progress/results.

## ⚠️ Known Limitations & Current Status (MVP)

* **Deadlock Parser:** The specific logic for parsing PostgreSQL deadlock details (`backend/app/utils/deadlock_parser.py`) is currently a **placeholder** and requires real Sentry event data examples for full implementation. The UI will show basic info if a deadlock signature is detected.
* **Automated Testing:** Comprehensive unit and integration tests are **not yet implemented**. This is a critical next step for ensuring reliability and stability.
* **Advanced Security:** Security measures are currently focused on managing the Sentry token via backend environment variables. Advanced hardening (e.g., more extensive input validation, rate limiting, dependency vulnerability scanning) is required for a production environment.
* **Advanced Performance Tuning:** While basic backend caching and frontend data fetching with TanStack Query are in place, further performance profiling and optimization may be needed for very large-scale use or extremely large datasets.
* **UI Polish:** The UI is functional and uses the Mantine component library for a clean look. However, further visual refinement, custom theming, and enhanced usability testing would improve the user experience.
* **Event ID for Detail View:** The current logic for selecting an *event* to view in the detail panel after clicking an *issue* row in the table might need refinement to ensure the most relevant event (e.g., latest) is fetched or to allow selection from multiple events within an issue group. For MVP, it makes a best effort to show *an* event's details.

## 🚀 Future Work (Beyond MVP)

* Full implementation of the detailed Deadlock Analyzer.
* Development of a comprehensive automated test suite.
* **Dexter+ Features:**
    * Trend Explorer & advanced analytics dashboards.
    * Full Case Builder with deeper Jira/ticketing integration.
    * Enhanced AI capabilities (e.g., conversational AI, solution suggestions, predictive insights).
    * User authentication and multi-tenancy.
    * More sophisticated filtering and search capabilities.
* Refer to the full Solution Design Document for a more detailed roadmap.

## 🤝 Contributing (Placeholder)

Details on how to contribute to Dexter will be added here if the project becomes open source or seeks external contributions.

## 📄 License (Placeholder)

Specify your project's license here (e.g., MIT, Apache 2.0).# dexter
