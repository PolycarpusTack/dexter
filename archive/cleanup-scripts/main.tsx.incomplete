// File: frontend/src/main.tsx

import React from 'react';
// Import createRoot directly as a named export
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';
import dexterTheme from './theme/theme';
// Import only our custom styles since other CSS is imported there
import './styles.css';

// Get the root element and check if it exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Create root using React 18's API
const root = createRoot(rootElement);

// Render the app
root.render(
  <React.StrictMode>
    <MantineProvider theme={dexterTheme} withCssVariables defaultColorScheme="light">
      <Notifications position="top-right" zIndex={1000} />
      <App />
    </MantineProvider>
  </React.StrictMode>
);
