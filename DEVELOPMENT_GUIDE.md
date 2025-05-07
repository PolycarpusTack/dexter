# Dexter Development Guide

## Project Overview

Dexter is an observability companion tool for Sentry.io, designed to democratize error data for different types of users while providing AI-powered insights. This guide tracks our progress in implementing the MVP features.

## Current Progress

We've completed the following development steps:

### Step 1: Export Functionality ✅

1. **Backend Changes**:
   - Added export endpoint in `backend/app/routers/issues.py`
   - Implemented CSV and JSON export functionality
   - Added pagination handling for fetching all issues

2. **Frontend Changes**:
   - Created `ExportControl.jsx` component with format selection (CSV/JSON)
   - Added `exportApi.js` for download functionality
   - Updated `EventTable.jsx` to include the export control

### Step 2: Event ID Handling ✅

1. **Store Updates**:
   - Enhanced `appStore.js` to store and manage latest event IDs per issue
   - Added a mapping system to track which event ID belongs to which issue
   - Implemented more robust event selection mechanism

2. **API Updates**:
   - Modified `issuesApi.js` to store latest event IDs when fetching issues
   - Created a proper separation between issue and event APIs
   - Created `eventsApi.js` for event-specific operations

3. **Component Updates**:
   - Fixed `EventDetail.jsx` to properly handle event ID availability
   - Improved error handling and user feedback for missing event IDs
   - Added better loading states and error messages

### Step 3: Error Handling ✅

1. **Backend Error Handling**:
   - Created custom error classes for different error types
   - Implemented a comprehensive global exception handler
   - Added structured error responses with error codes and details
   - Updated main.py to register the exception handlers

2. **Frontend Error Handling**:
   - Created error handling utilities for consistent error formatting and notifications
   - Implemented an ErrorBoundary component to catch React errors
   - Added proper error handling in API calls
   - Updated App.jsx to wrap components with ErrorBoundary
   - Enhanced index.jsx with global error handling for React Query

### Step 4: UI/UX Polish ✅

1. **Theme and Design System**:
   - Created a comprehensive theme system with consistent colors, typography, and spacing
   - Implemented a design token system for maintainable styling
   - Added improved component styling with attention to detail

2. **Accessibility Improvements**:
   - Added proper ARIA attributes to interactive elements
   - Created AccessibleIcon component for better screen reader support
   - Ensured proper color contrast throughout the application
   - Implemented keyboard navigation support
   - Used semantic HTML elements with appropriate roles

3. **User Experience Enhancements**:
   - Added tooltips for contextual help
   - Implemented empty states for all main components
   - Created loading skeletons for better loading experiences
   - Improved feedback mechanisms for user actions
   - Enhanced navigation with breadcrumbs and clear section headers

4. **Visual Improvements**:
   - Redesigned EventTable with better spacing and visual hierarchy
   - Enhanced EventDetail component with improved readability for technical data
   - Improved error message presentations
   - Added visual differentiation for severity levels and statuses
   - Created a more polished and professional look and feel

5. **New Reusable Components**:
   - Created EmptyState component for consistent empty state patterns
   - Added LoadingSkeleton component for loading states
   - Implemented InfoTooltip for contextual help
   - Added AccessibleIcon for better screen reader support

## Setup Instructions

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourorg/dexter.git
   cd dexter
   ```

2. Set up Python environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install poetry
   poetry install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env to add your Sentry API token and other settings
   ```

4. Run the backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Set up Node environment:
   ```bash
   cd frontend
   npm install  # or yarn install
   ```

2. Configure environment variables:
   ```bash
   cp .env.development.example .env.development
   # Edit .env.development to configure API URL and other settings
   ```

3. Run the frontend:
   ```bash
   npm run dev  # or yarn dev
   ```

4. Access the application at `http://localhost:5173`

## Docker Setup

For Docker-based development:

1. Build and run using Docker:
   ```bash
   docker-compose up --build
   ```

2. Access the application at `http://localhost:5173`

## Next Steps

The following items are next on our development roadmap:

1. **Documentation & Testing**:
   - Expand README.md with comprehensive setup instructions
   - Document API endpoints
   - Add code comments where missing
   - Implement tests for backend services
   - Add frontend component tests

2. **DevOps & Deployment**:
   - Create a docker-compose.yml for easy local deployment
   - Document Docker-based setup process
   - Add logging & monitoring

## Development Workflow

This guide outlines the recommended workflow for continuing development on the Dexter MVP:

1. **Feature Development Process**
   - Create a new branch for each feature: `git checkout -b feature/feature-name`
   - Follow the separation of concerns in existing code
   - Add proper error handling using established patterns
   - Test locally before submitting PR
   - Update documentation as needed

2. **Code Organization**
   - **Backend**: Maintain clear separation between routers, services, and models
   - **Frontend**: Keep components modular and reusable

3. **Testing**
   - **Manual Testing**: Test with real Sentry data before committing
   - **Automated Testing**: Add tests for new functionality
   - **Error Handling**: Test error paths and edge cases

4. **Coding Standards**
   - Follow existing code formatting and structure
   - Add appropriate comments for complex logic
   - Use typed parameters and return values
   - Use semantic variable and function names

## UI/UX Guidelines

When continuing development, adhere to these UI/UX principles to maintain consistency:

1. **Design System**
   - Use the established color system defined in `theme.js`
   - Follow typography guidelines for headings and text
   - Maintain consistent spacing using the defined spacing scale
   - Use the defined component styles for buttons, cards, etc.

2. **Accessibility**
   - Always provide ARIA labels for interactive elements
   - Use the AccessibleIcon component for icons that convey meaning
   - Ensure color contrast meets WCAG AA standards
   - Support keyboard navigation for all interactive elements
   - Use semantic HTML elements

3. **User Experience**
   - Provide empty states for all components that display data
   - Use loading skeletons during data fetching
   - Provide clear feedback for user actions
   - Use tooltips for contextual help
   - Make error messages helpful and actionable

4. **Consistency**
   - Use established patterns for common UI elements
   - Follow the same layout structure across the application
   - Maintain consistent spacing and alignment
   - Use the same visual language for similar components

## Notes for Developers

- The export functionality handles pagination to fetch all issues before creating the export file
- The UI now features an Export button in the top-right corner of the Event Table
- Both CSV and JSON formats are supported with proper file naming
- Error handling is now consistent across the application
- ErrorBoundary components are used to catch and display React errors
- Global exception handling is implemented in the backend
- The application now has a more polished and professional look and feel
- Design tokens and component styles are defined in `theme.js`
- Reusable UI components are located in `components/UI`
