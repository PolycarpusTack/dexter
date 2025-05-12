# Dexter Development Guide

## Overview

This document provides a comprehensive guide for developers working on the Dexter project. It consolidates information from multiple development-related documents into a single reference.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Code Organization](#code-organization)
3. [TypeScript Guidelines](#typescript-guidelines)
4. [Component Development](#component-development)
5. [State Management](#state-management)
6. [Testing Strategy](#testing-strategy)
7. [Code Style and Linting](#code-style-and-linting)
8. [Pull Request Process](#pull-request-process)
9. [Debugging Tips](#debugging-tips)

## Development Environment Setup

### Prerequisites

To work on Dexter, you'll need:

- Node.js (v16 or higher)
- npm (v7 or higher)
- Python 3.8+
- Poetry (Python dependency management)
- Git

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/dexter.git
   cd dexter
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```
   This will install dependencies for both frontend and backend.

3. Generate API types:
   ```bash
   npm run generate:types
   ```

4. Start the development servers:
   ```bash
   # In one terminal
   npm run frontend:dev
   
   # In another terminal
   npm run backend:dev
   ```

5. Access the application at `http://localhost:5173`

### Environment Configuration

Create a `.env` file in the frontend directory with the following variables:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=v1
VITE_ENABLE_MOCK_API=false
```

For backend environment configuration, see the backend README.

## Code Organization

The codebase follows a structured organization:

### Frontend Structure

```
frontend/
├── public/           # Static assets
├── src/
│   ├── api/          # API clients and utilities
│   ├── components/   # React components
│   ├── config/       # Configuration files
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Page components
│   ├── router/       # Routing configuration
│   ├── schemas/      # Zod schemas
│   ├── services/     # Business logic
│   ├── store/        # State management
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── tests/            # Test files
└── vite.config.ts    # Vite configuration
```

### Component Organization

Components follow a structured organization:

```
components/
├── ComponentName/
│   ├── ComponentName.tsx       # Main component
│   ├── ComponentName.test.tsx  # Tests
│   ├── ComponentName.module.css (if needed)
│   ├── subcomponents/          # Child components
│   └── index.ts                # Public exports
```

## TypeScript Guidelines

### Type Definitions

1. **Be explicit with types**:
   ```typescript
   // Good
   function fetchData(id: string): Promise<Data> {
     // Implementation
   }
   
   // Avoid
   function fetchData(id) {
     // Implementation
   }
   ```

2. **Use interfaces for objects**:
   ```typescript
   interface User {
     id: string;
     name: string;
     email: string;
     role: 'admin' | 'user';
   }
   ```

3. **Use type aliases for unions and complex types**:
   ```typescript
   type Status = 'pending' | 'fulfilled' | 'rejected';
   type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
   ```

4. **Export types from a central location**:
   ```typescript
   // src/types/index.ts
   export * from './user';
   export * from './event';
   export * from './issue';
   ```

### Type Safety

1. **Avoid `any` where possible**:
   ```typescript
   // Instead of any, use unknown and then type narrowing
   function processData(data: unknown): string {
     if (typeof data === 'string') {
       return data.toUpperCase();
     }
     throw new Error('Data must be a string');
   }
   ```

2. **Use type guards**:
   ```typescript
   function isIssue(obj: unknown): obj is Issue {
     return (
       obj !== null &&
       typeof obj === 'object' &&
       'id' in obj &&
       'title' in obj
     );
   }
   ```

3. **Utilize generics for reusable components**:
   ```typescript
   function createResource<T>(url: string): Promise<T> {
     // Implementation
   }
   ```

## Component Development

### Functional Components

Use functional components with hooks:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <button
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default Button;
```

### Custom Hooks

Extract common logic into custom hooks:

```typescript
function useEventData(eventId: string) {
  const [data, setData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        const result = await api.events.getEvent(eventId);
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  return { data, loading, error };
}
```

### Composition

Prefer composition over inheritance:

```typescript
// Instead of extending components, compose them
const EnhancedButton = ({ children, ...props }) => (
  <Tooltip content="Click me">
    <Button {...props}>{children}</Button>
  </Tooltip>
);
```

## State Management

### Local State

Use React hooks for component-local state:

```typescript
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Global State

Use Redux Toolkit for global state:

```typescript
// store/slices/issuesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IssuesState {
  items: Issue[];
  loading: boolean;
  error: string | null;
}

const initialState: IssuesState = {
  items: [],
  loading: false,
  error: null,
};

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    fetchIssuesStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchIssuesSuccess(state, action: PayloadAction<Issue[]>) {
      state.items = action.payload;
      state.loading = false;
    },
    fetchIssuesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchIssuesStart, fetchIssuesSuccess, fetchIssuesFailure } = issuesSlice.actions;
export default issuesSlice.reducer;
```

### Server State

Use TanStack Query (React Query) for server state:

```typescript
function IssuesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['issues'],
    queryFn: () => api.issues.list(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {data.map(issue => (
        <li key={issue.id}>{issue.title}</li>
      ))}
    </ul>
  );
}
```

## Testing Strategy

### Unit Tests

Write unit tests for individual components and utilities:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders with the correct label', () => {
    render(<Button label="Click Me" onClick={jest.fn()} />);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button label="Click Me" onClick={handleClick} />);
    await userEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Click Me" onClick={jest.fn()} disabled />);
    expect(screen.getByText('Click Me')).toBeDisabled();
  });
});
```

### Integration Tests

Test component interactions:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IssueForm from './IssueForm';
import { api } from '../../api';

// Mock the API
jest.mock('../../api');

describe('IssueForm', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits the form with entered data', async () => {
    api.issues.create.mockResolvedValueOnce({ id: '123', title: 'Test Issue' });

    render(
      <QueryClientProvider client={queryClient}>
        <IssueForm onSuccess={jest.fn()} />
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByLabelText(/title/i), 'Test Issue');
    await userEvent.type(screen.getByLabelText(/description/i), 'Test Description');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(api.issues.create).toHaveBeenCalledWith({
        title: 'Test Issue',
        description: 'Test Description',
      });
    });
  });
});
```

### E2E Tests

Use Cypress for end-to-end testing:

```javascript
// cypress/integration/issues.spec.js
describe('Issues Page', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/issues', { fixture: 'issues.json' }).as('getIssues');
    cy.visit('/issues');
    cy.wait('@getIssues');
  });

  it('displays a list of issues', () => {
    cy.get('[data-testid="issue-list-item"]').should('have.length', 3);
    cy.get('[data-testid="issue-list-item"]').first().should('contain', 'First Issue');
  });

  it('navigates to issue details when an issue is clicked', () => {
    cy.intercept('GET', '/api/issues/1', { fixture: 'issue-1.json' }).as('getIssue');
    cy.get('[data-testid="issue-list-item"]').first().click();
    cy.wait('@getIssue');
    cy.url().should('include', '/issues/1');
    cy.get('h1').should('contain', 'First Issue');
  });
});
```

## Code Style and Linting

### ESLint Configuration

Use ESLint for code quality:

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // Custom rules here
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

### Formatting with Prettier

Use Prettier for consistent formatting:

```javascript
// .prettierrc
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "arrowParens": "avoid"
}
```

### Pre-commit Hooks

Use Husky and lint-staged for pre-commit checks:

```javascript
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## Pull Request Process

1. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**:
   - Write code
   - Add tests
   - Update documentation

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```
   
   Follow conventional commits format:
   - `feat`: A new feature
   - `fix`: A bug fix
   - `docs`: Documentation changes
   - `style`: Formatting changes
   - `refactor`: Code changes that neither fix bugs nor add features
   - `test`: Adding or updating tests
   - `chore`: Changes to the build process or auxiliary tools

4. **Push your changes**:
   ```bash
   git push origin feature/my-feature
   ```

5. **Create a pull request**:
   - Use the PR template
   - Add a detailed description
   - Link related issues

6. **Code review**:
   - Address review comments
   - Make requested changes
   - Re-request review when ready

7. **Merge**:
   - Squash and merge
   - Delete branch after merging

## Debugging Tips

### React Developer Tools

Use React Developer Tools browser extension for component debugging.

### Redux DevTools

Use Redux DevTools for state debugging:

```javascript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers';

const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
```

### Network Debugging

Use browser dev tools network tab for API debugging.

### React Query DevTools

Enable React Query DevTools in development:

```javascript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### Error Boundaries

Use error boundaries for runtime error debugging:

```javascript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function MyComponent() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ComponentThatMightError />
    </ErrorBoundary>
  );
}
```
