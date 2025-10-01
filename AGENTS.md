# Repository Guidelines

## Project Structure & Module Organization
- Root: monorepo with `frontend/` (React + Vite + TS) and `backend/` (FastAPI, Poetry).
- Backend: app code in `backend/app/` (routers, services, models), tests in `backend/tests/`.
- Frontend: source in `frontend/src/` (components, hooks, api, config), tests in `frontend/tests/` and `frontend/src/test/`.
- Docs and automation: `.github/` (CI), `scripts/` (type generation), `docker-compose.yml` for local orchestration.

## Build, Test, and Development Commands
- Install all: `npm run install:all` (root) — installs root, frontend, and backend (Poetry).
- Run dev:
  - Frontend: `npm run dev` (in `frontend/`).
  - Backend: `python -m app.main` (in `backend/`) or `npm run backend:dev` (root).
- Frontend build/lint: `npm run build`, `npm run lint`, `npm run typecheck` (in `frontend/`).
- Backend tests: `pytest -v` (in `backend/`). Example: `pytest -m unit`.
- Type generation: `npm run generate:api-types` (root or `frontend/`).

## Coding Style & Naming Conventions
- Python: PEP 8, 4-space indent; run Black/Isort/Flake8/Mypy (configured in `backend/pyproject.toml`).
- JS/TS: 2-space indent; ESLint + TypeScript. Prefer functional React components.
- Naming:
  - Python: snake_case for modules/functions, PascalCase for classes; tests `test_*.py`.
  - Frontend: components `PascalCase.tsx` in `src/components/`; hooks `useThing.ts` in `src/hooks/`.

## Testing Guidelines
- Backend: Pytest with coverage; markers `unit`, `integration`, `slow`. Coverage threshold ≥ 80% (see `backend/pytest.ini`). Run with `pytest --cov`.
- Frontend: Vitest + Testing Library, JSDOM env. Setup in `frontend/vitest.config.ts` and `src/test/setup.ts`.
- Prefer fast unit tests; add integration tests where behavior spans API + UI. Include mocks under `tests/mocks/`.

## Commit & Pull Request Guidelines
- Commits: concise, present tense, include scope when helpful (e.g., `backend:`, `frontend:`) and link issues (`Fixes #123`). Avoid large multi-purpose commits.
- PRs: follow `.github/pull_request_template.md` — clear description, related issues, testing notes, screenshots when UI changes, and updated docs where applicable.
- CI: GitHub Actions runs lint, type-check, and tests for both apps. Ensure green checks before requesting review.

## Security & Configuration Tips
- Never commit secrets. Use `backend/.env` (see `backend/.env.example`) and `frontend/.env*` for local overrides.
- Default local services: Redis on `localhost:6379`; configure via `REDIS_URL` and `SENTRY_DSN` in environment.
- For full stack locally, use `docker-compose.yml` after ensuring images build.

