# Install missing dependencies

# Dev dependencies for testing
npm install --save-dev vitest @vitest/coverage-v8 @vitest/ui
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev axios-mock-adapter msw
npm install --save-dev axe-core @axe-core/react

# TypeScript types
npm install --save-dev @types/testing-library__jest-dom

# Production dependencies
npm install --save @mantine/form react-redux @reduxjs/toolkit

# Install dependencies to fix TSC errors
npm install
