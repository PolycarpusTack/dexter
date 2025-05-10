# Dexter Frontend

The Dexter frontend is a React-based application that provides an enhanced interface for Sentry error monitoring with AI-powered analysis capabilities.

## Setup Instructions

1. **Clone the repository and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   # The .env file is already created with default values
   # Edit .env if you need to change the backend URL
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5175` (or another port shown in the terminal)

## Configuration

The frontend uses the following environment variables (defined in `.env`):

- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8001/api/v1)
- `VITE_SENTRY_WEB_URL`: Sentry web interface URL (default: https://sentry.io)

## Fixing API Errors (405 Method Not Allowed)

If you're seeing 405 Method Not Allowed errors:

1. **Ensure the backend is running on the correct port:**
   - The backend should be running on port 8001
   - Check the backend terminal to confirm it's running

2. **Verify the frontend environment configuration:**
   - Open `frontend/.env`
   - Ensure `VITE_API_BASE_URL=http://localhost:8001/api/v1`

3. **Restart the frontend development server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

4. **Clear browser cache and reload:**
   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - Open DevTools and disable cache

5. **Check CORS settings:**
   - The backend is configured to allow all origins during development
   - If you still see CORS errors, check the backend logs

## Development Features

- TypeScript for type safety
- React Query for efficient data fetching
- Mantine UI components
- Error boundaries for graceful error handling
- Hot Module Replacement (HMR) for fast development

## Project Structure

```
src/
├── api/           # API client and service modules
├── components/    # React components
├── hooks/         # Custom React hooks
├── pages/         # Page components
├── store/         # State management
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── main.tsx       # Application entry point
```

## Common Issues and Solutions

### API Connection Issues

**Problem:** Frontend can't connect to the backend
**Solution:** 
- Ensure the backend is running on port 8001
- Check the `VITE_API_BASE_URL` in `.env`
- Look for CORS errors in the browser console

### Build Issues

**Problem:** TypeScript compilation errors
**Solution:**
- Run `npm run type-check` to see detailed errors
- Fix any TypeScript errors in your code
- Ensure all dependencies are installed correctly

### Environment Variables Not Working

**Problem:** Changes to `.env` not taking effect
**Solution:**
- Restart the development server after changing `.env`
- Ensure variables start with `VITE_`
- Check that the `.env` file is in the root of the frontend directory

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Production Build

To create a production build:

1. Ensure environment variables are set correctly
2. Run `npm run build`
3. The build will be in the `dist` directory
4. Serve the `dist` directory with any static file server

## Contributing

When contributing to the frontend:

1. Follow the existing code style
2. Add TypeScript types for all new code
3. Use the Mantine UI component library for UI elements
4. Add error boundaries for new features
5. Write meaningful commit messages
