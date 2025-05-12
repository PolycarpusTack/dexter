# Dexter Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered in the Dexter application. It consolidates troubleshooting information from multiple documents into a single reference.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Common Runtime Errors](#common-runtime-errors)
3. [API Connection Problems](#api-connection-problems)
4. [Performance Issues](#performance-issues)
5. [UI and Rendering Problems](#ui-and-rendering-problems)
6. [TypeScript and Build Errors](#typescript-and-build-errors)
7. [Testing Issues](#testing-issues)
8. [Logging and Debugging](#logging-and-debugging)

## Installation Issues

### Node Version Conflicts

**Issue**: Installation fails with Node.js version compatibility errors.

**Solution**:
1. Ensure you are using Node.js version 16.0.0 or higher:
   ```bash
   node --version
   ```

2. If needed, install the correct version using NVM (Node Version Manager):
   ```bash
   nvm install 16
   nvm use 16
   ```

3. Clean the npm cache and try installing again:
   ```bash
   npm cache clean --force
   npm run install:all
   ```

### Package Resolution Errors

**Issue**: Dependency conflicts during installation.

**Solution**:
1. Clear node_modules folders:
   ```bash
   rm -rf node_modules
   rm -rf frontend/node_modules
   ```

2. Delete package-lock.json files:
   ```bash
   rm package-lock.json
   rm frontend/package-lock.json
   ```

3. Reinstall with forced resolution:
   ```bash
   npm run install:all --force
   ```

### Python Environment Issues

**Issue**: Backend installation fails due to Python environment problems.

**Solution**:
1. Ensure you have Python 3.8+ installed:
   ```bash
   python --version
   ```

2. Install Poetry if not already installed:
   ```bash
   pip install poetry
   ```

3. Create a clean virtual environment:
   ```bash
   cd backend
   poetry env remove --all
   poetry install
   ```

## Common Runtime Errors

### "Cannot read property of undefined" Errors

**Issue**: Runtime errors due to accessing properties of undefined objects.

**Solution**:
1. Add null checking with optional chaining:
   ```typescript
   // Instead of this:
   const value = obj.prop.nestedProp;
   
   // Use this:
   const value = obj?.prop?.nestedProp;
   ```

2. Add default values with nullish coalescing:
   ```typescript
   const value = obj?.prop?.nestedProp ?? defaultValue;
   ```

### React Key Warnings

**Issue**: Warning about missing keys in lists.

**Solution**:
1. Add unique keys to all list items:
   ```tsx
   // Instead of this:
   {items.map(item => (
     <ListItem item={item} />
   ))}
   
   // Use this:
   {items.map(item => (
     <ListItem key={item.id} item={item} />
   ))}
   ```

2. If no natural key exists, use index as a last resort:
   ```tsx
   {items.map((item, index) => (
     <ListItem key={`item-${index}`} item={item} />
   ))}
   ```

### Component Rendering Issues

**Issue**: Components failing to render or update properly.

**Solution**:
1. Check for missing dependencies in useEffect:
   ```typescript
   // Add all dependencies used inside the effect
   useEffect(() => {
     // Effect using data and callback
   }, [data, callback]); // Include all dependencies
   ```

2. Verify prop types match expected types:
   ```typescript
   interface ComponentProps {
     data: DataType;
     onAction: (id: string) => void;
   }
   ```

3. Use React Developer Tools to inspect component hierarchy.

## API Connection Problems

### API Connection Timeout

**Issue**: API requests time out without response.

**Solution**:
1. Check API base URL configuration:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```

2. Ensure the backend server is running:
   ```bash
   npm run backend:dev
   ```

3. Increase request timeout:
   ```typescript
   // In apiClient.ts
   const instance = axios.create({
     baseURL: config.apiBaseUrl,
     timeout: 30000, // Increase timeout to 30 seconds
   });
   ```

### CORS Errors

**Issue**: Cross-Origin Resource Sharing (CORS) errors in browser console.

**Solution**:
1. Ensure backend CORS settings include frontend origin:
   ```python
   # In backend/app/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. Verify that API requests include the correct credentials:
   ```typescript
   const instance = axios.create({
     baseURL: config.apiBaseUrl,
     withCredentials: true,
   });
   ```

### Authentication Failures

**Issue**: API requests fail with 401/403 errors.

**Solution**:
1. Check if token is expired or invalid:
   ```typescript
   // Add token refresh logic
   api.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401) {
         try {
           await refreshToken();
           return api(error.config);
         } catch (refreshError) {
           // Handle refresh failure (logout, etc.)
           logout();
         }
       }
       return Promise.reject(error);
     }
   );
   ```

2. Verify proper authorization headers:
   ```typescript
   api.interceptors.request.use((config) => {
     const token = getToken();
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   ```

## Performance Issues

### Slow Initial Load

**Issue**: Application takes a long time to load initially.

**Solution**:
1. Implement code splitting using React.lazy and Suspense:
   ```tsx
   const LazyComponent = React.lazy(() => import('./LazyComponent'));
   
   function App() {
     return (
       <Suspense fallback={<LoadingSpinner />}>
         <LazyComponent />
       </Suspense>
     );
   }
   ```

2. Preload critical components:
   ```tsx
   // Preload important routes
   const ImportantPage = React.lazy(() => import('./ImportantPage'));
   // Trigger preload
   import('./ImportantPage');
   ```

3. Analyze bundle size with visualization tools:
   ```bash
   npm run build:analyze
   ```

### Memory Leaks

**Issue**: Memory usage grows over time, leading to performance degradation.

**Solution**:
1. Clean up effect subscriptions:
   ```typescript
   useEffect(() => {
     const subscription = subscribe();
     
     return () => {
       subscription.unsubscribe();
     };
   }, []);
   ```

2. Fix event listener leaks:
   ```typescript
   useEffect(() => {
     const handleResize = () => {
       // Handle resize
     };
     
     window.addEventListener('resize', handleResize);
     
     return () => {
       window.removeEventListener('resize', handleResize);
     };
   }, []);
   ```

3. Use React DevTools Profiler to identify problematic components.

### Render Performance

**Issue**: UI becomes sluggish during interaction.

**Solution**:
1. Memoize expensive computations:
   ```typescript
   const memoizedValue = useMemo(() => {
     return computeExpensiveValue(a, b);
   }, [a, b]);
   ```

2. Prevent unnecessary re-renders with React.memo:
   ```typescript
   const MemoizedComponent = React.memo(MyComponent);
   ```

3. Use virtualization for long lists:
   ```tsx
   import { Virtuoso } from 'react-virtuoso';
   
   function VirtualList({ items }) {
     return (
       <Virtuoso
         data={items}
         itemContent={(index, item) => <ListItem item={item} />}
         totalCount={items.length}
       />
     );
   }
   ```

## UI and Rendering Problems

### CSS Layout Issues

**Issue**: Components display with incorrect layout or styling.

**Solution**:
1. Inspect element using browser dev tools to identify CSS issues.

2. Check for CSS conflicts in specificity:
   ```css
   /* Ensure proper specificity */
   .component .specific-element {
     margin: 10px;
   }
   ```

3. Verify responsive design breakpoints:
   ```css
   @media (max-width: 768px) {
     .responsive-element {
       width: 100%;
     }
   }
   ```

### Font and Icon Loading

**Issue**: Custom fonts or icons fail to load.

**Solution**:
1. Ensure font files are properly included in the project.

2. Check font loading in CSS:
   ```css
   @font-face {
     font-family: 'CustomFont';
     src: url('../fonts/CustomFont.woff2') format('woff2');
     font-weight: normal;
     font-style: normal;
     font-display: swap;
   }
   ```

3. Verify icon imports from @tabler/icons-react:
   ```typescript
   import { IconBug, IconAlert } from '@tabler/icons-react';
   ```

### Modal Dialog Issues

**Issue**: Modal dialogs don't render properly or have focus management problems.

**Solution**:
1. Check z-index values:
   ```css
   .modal-overlay {
     z-index: 1000;
   }
   ```

2. Ensure proper focus management:
   ```typescript
   useEffect(() => {
     if (isOpen) {
       // Save previous active element
       const previousActive = document.activeElement;
       
       // Focus first interactive element in modal
       firstInteractiveRef.current?.focus();
       
       return () => {
         // Restore focus when modal closes
         if (previousActive instanceof HTMLElement) {
           previousActive.focus();
         }
       };
     }
   }, [isOpen]);
   ```

## TypeScript and Build Errors

### Type Definition Errors

**Issue**: TypeScript compilation fails due to missing or incorrect types.

**Solution**:
1. Ensure proper type imports:
   ```typescript
   import { ComponentProps } from './types';
   ```

2. Create type definition files for missing modules:
   ```typescript
   // external-module.d.ts
   declare module 'external-module' {
     export function someFunction(): void;
     export default class SomeClass {}
   }
   ```

3. Add type assertions when types cannot be inferred:
   ```typescript
   const element = document.getElementById('root') as HTMLElement;
   ```

### Build Process Failures

**Issue**: Build process fails with errors.

**Solution**:
1. Clear build cache and try again:
   ```bash
   npm run clean
   npm run build
   ```

2. Update TypeScript version if needed:
   ```bash
   npm install typescript@latest --save-dev
   ```

3. Check for conflicting dependencies and resolve:
   ```bash
   npm dedupe
   ```

### ESLint Errors

**Issue**: ESLint reports errors preventing build.

**Solution**:
1. Fix lint errors automatically when possible:
   ```bash
   npm run lint -- --fix
   ```

2. Add specific ESLint ignores for special cases:
   ```typescript
   // eslint-disable-next-line react-hooks/exhaustive-deps
   ```

3. Update ESLint configuration if needed:
   ```javascript
   // .eslintrc.js
   module.exports = {
     // Configuration
     rules: {
       // Adjust rules as needed
       'react/prop-types': 'off',
     },
   };
   ```

## Testing Issues

### Jest Test Failures

**Issue**: Unit tests fail with various errors.

**Solution**:
1. Update test snapshots if UI has changed intentionally:
   ```bash
   npm test -- -u
   ```

2. Mock dependencies properly:
   ```typescript
   // __mocks__/axios.js
   export default {
     get: jest.fn().mockResolvedValue({ data: {} }),
     post: jest.fn().mockResolvedValue({ data: {} }),
   };
   ```

3. Fix test environment setup:
   ```typescript
   // setup-tests.ts
   import '@testing-library/jest-dom';
   
   global.matchMedia = global.matchMedia || function() {
     return {
       matches: false,
       addListener: jest.fn(),
       removeListener: jest.fn(),
     };
   };
   ```

### React Testing Library Issues

**Issue**: Tests using React Testing Library fail.

**Solution**:
1. Use correct queries to find elements:
   ```typescript
   // Prefer these queries in this order:
   getByRole('button', { name: /submit/i });
   getByLabelText('Username');
   getByText('Submit');
   getByTestId('submit-button');
   ```

2. Handle asynchronous operations correctly:
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument();
   });
   ```

3. Properly setup providers in tests:
   ```typescript
   const Wrapper = ({ children }) => (
     <Provider store={store}>
       <Router>
         {children}
       </Router>
     </Provider>
   );
   
   render(<MyComponent />, { wrapper: Wrapper });
   ```

## Logging and Debugging

### Enabling Verbose Logging

To enable more detailed logging for troubleshooting:

1. Set environment variables:
   ```
   VITE_DEBUG_LEVEL=verbose
   ```

2. Use the debug utility:
   ```typescript
   import { debug } from '../utils/debug';
   
   function myFunction() {
     debug.log('Detailed info for debugging', { extraData });
   }
   ```

3. Enable React Query DevTools in development:
   ```tsx
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   
   function App() {
     return (
       <>
         <AppContent />
         {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
       </>
     );
   }
   ```

### Debugging Network Requests

For network-related issues:

1. Enable API request/response logging:
   ```typescript
   // In apiClient.ts
   api.interceptors.request.use(request => {
     console.log('Starting Request', request);
     return request;
   });
   
   api.interceptors.response.use(response => {
     console.log('Response:', response);
     return response;
   });
   ```

2. Use the browser Network tab to inspect requests.

3. Try the request with a tool like Postman to isolate frontend/backend issues.

### Debugging React Component Issues

For React component issues:

1. Use React Developer Tools to inspect component props and state.

2. Add key lifecycle logging:
   ```typescript
   useEffect(() => {
     console.log('Component mounted with props:', props);
     
     return () => {
       console.log('Component unmounting');
     };
   }, [props]);
   ```

3. Implement error boundaries to catch and display component errors:
   ```tsx
   <ErrorBoundary FallbackComponent={ErrorDisplay}>
     <ProblemComponent />
   </ErrorBoundary>
   ```
