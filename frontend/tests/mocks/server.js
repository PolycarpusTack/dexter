// File: frontend/tests/mocks/server.js (Example MSW setup)

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers);