// frontend/src/api/enhancedDeadlockApi.js

/**
 * Enhanced API functions for deadlock analysis
 */
import axios from 'axios';
import { API_BASE_URL, axiosConfig } from './config';
import { showErrorNotification } from '../utils/errorHandling';

// Create an axios instance with our configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  ...axiosConfig,
  headers: {
    ...axiosConfig.headers,
    'Accept': 'application/json',
  }
});

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Check for CORS errors
    if (error.message === 'Network Error') {
      console.warn('Possible CORS issue detected');
      // You could add custom CORS error handling here
    }
    
    return Promise.reject(error);
  }
);

/**
 * Analyze a deadlock for a specific event using the enhanced analyzer
 * @param {string} eventId - The ID of the event to analyze
 * @param {Object} options - Options for the analysis
 * @param {boolean} options.useEnhancedAnalysis - Whether to use enhanced analysis
 * @param {string} options.apiPath - API path to use (enhanced-analyzers or analyzers)
 * @returns {Promise<object>} - The deadlock analysis result
 */
export async function analyzeDeadlock(eventId, options = {}) {
  const { useEnhancedAnalysis = true, apiPath = 'enhanced-analyzers' } = options;
  
  try {
    const url = `/${apiPath}/analyze-deadlock/${eventId}`;
    
    // Track analysis start time for performance monitoring
    const startTime = performance.now();
    
    const response = await apiClient.get(url);
    
    // Calculate analysis duration
    const duration = performance.now() - startTime;
    console.debug(`Deadlock analysis completed in ${duration.toFixed(2)}ms`);
    
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail?.message || 
                         error.response?.data?.detail || 
                         error.message || 
                         'Unknown error';
                         
    const errorContext = error.response?.data?.detail?.context || {};
    
    console.error(`Error analyzing deadlock for event ${eventId}:`, errorMessage, errorContext);
    
    // Show notification to user
    showErrorNotification({
      title: 'Deadlock Analysis Failed',
      message: errorMessage,
    });
    
    // Rethrow to allow React Query to handle it
    throw error;
  }
}

/**
 * Get lock compatibility matrix for reference
 * @returns {Promise<object>} - The lock compatibility matrix
 */
export async function getLockCompatibilityMatrix() {
  try {
    const response = await apiClient.get(`/enhanced-analyzers/lock-compatibility-matrix`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
    console.error(`Error fetching lock compatibility matrix:`, errorMessage);
    
    // Show notification to user
    showErrorNotification({
      title: 'Failed to Load Lock Matrix',
      message: errorMessage,
    });
    
    // Rethrow to allow React Query to handle it
    throw error;
  }
}

/**
 * Get deadlock history
 * @param {Object} options - Options for history retrieval
 * @param {number} options.days - Number of days to look back
 * @returns {Promise<object>} - The deadlock history data
 */
export async function getDeadlockHistory(options = { days: 30 }) {
  try {
    const response = await apiClient.get(`/enhanced-analyzers/deadlock-history`, {
      params: { days: options.days }
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
    console.error(`Error fetching deadlock history:`, errorMessage);
    
    // Show notification to user
    showErrorNotification({
      title: 'Failed to Load Deadlock History',
      message: errorMessage,
    });
    
    // Rethrow to allow React Query to handle it
    throw error;
  }
}

/**
 * Export deadlock visualization as SVG
 * @param {string} eventId - The ID of the event
 * @param {SVGElement} svgElement - The SVG element to export
 */
export function exportDeadlockSVG(eventId, svgElement) {
  if (!svgElement) return;
  
  try {
    // Create a copy of the SVG element
    const svgCopy = svgElement.cloneNode(true);
    
    // Add metadata about deadlock
    const metadataComment = document.createComment(`Deadlock Analysis for Event: ${eventId}, Generated: ${new Date().toISOString()}`);
    svgCopy.prepend(metadataComment);
    
    // Add some metadata and styling
    svgCopy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgCopy.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    // Remove any transform applied by zoom
    const transformElement = svgCopy.querySelector('g');
    if (transformElement) {
      transformElement.removeAttribute('transform');
    }
    
    // Add CSS styles for printing
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        text { font-family: Arial, sans-serif; }
        .node text { font-weight: bold; }
      }
    `;
    svgCopy.appendChild(style);
    
    // Convert SVG to string
    const svgData = new XMLSerializer().serializeToString(svgCopy);
    
    // Create a Blob and URL
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `deadlock-${eventId}.svg`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting SVG:', error);
    showErrorNotification({
      title: 'SVG Export Failed',
      message: error.message || 'Failed to export SVG',
    });
  }
}

// Mock data for development - Defined in the correct order to avoid circular reference issues

// Define mock recommendation text first
const MOCK_RECOMMENDATION = `
## Deadlock Analysis

This deadlock involves **2** processes that were attempting to access the following tables: **users, accounts**.

### Root Cause

The deadlock occurred because multiple transactions were trying to acquire locks (ShareLock) on the same tables but in different orders, creating a circular waiting pattern.

The deadlock was caused by concurrent UPDATE statements that acquired row locks in different orders.

### Recommended Solutions

1. **Consistent Access Order**: Ensure all transactions access tables in the same order:
   \`\`\`
   accounts → users
   \`\`\`

2. **Row Locking Strategy**: For UPDATE operations:
   - Consider using optimistic concurrency control instead of locks where possible
   - Add \`FOR UPDATE SKIP LOCKED\` for queue-like workloads
   - Add explicit transaction ordering in the application

3. **Lock Mode Optimization**: Consider using less restrictive lock modes:
   - Use \`FOR SHARE\` instead of \`FOR UPDATE\` when possible
   - Use \`NOWAIT\` option to fail fast rather than deadlock
   - Consider optimistic concurrency control where appropriate

4. **Application Changes**: Review application code that accesses these tables:
   - Look for functions/methods that update multiple tables
   - Ensure all code paths use consistent table access ordering
   - Consider using advisory locks for complex operations

5. **Database Configuration**:
   - Review and possibly adjust \`deadlock_timeout\` setting (current default is 1s)
   - Consider setting appropriate \`statement_timeout\` to prevent long-running transactions
   - Enable \`log_lock_waits\` to catch potential deadlock situations before they occur

### Example Code Pattern

Based on the queries involved, consider refactoring your transactions to follow this pattern:

\`\`\`sql
BEGIN;
-- Always access tables in alphabetical order
UPDATE accounts SET balance = balance - 100 WHERE user_id = 42;
UPDATE users SET last_login = now() WHERE id = 42;
COMMIT;
\`\`\`
`;

// Define visualization data
const MOCK_VISUALIZATION_DATA = {
  nodes: [
    {
      id: 'process_12345',
      label: 'Process 12345',
      type: 'process',
      tables: ['users', 'accounts'],
      query: 'UPDATE accounts SET balance = balance - 100 WHERE user_id = 42',
      locks_held: ['ShareLock on accounts'],
      locks_waiting: ['ShareLock on users'],
      inCycle: true,
      application: 'app-backend',
      username: 'postgres'
    },
    {
      id: 'process_67890',
      label: 'Process 67890',
      type: 'process',
      tables: ['users', 'transactions'],
      query: 'UPDATE users SET last_login = now() WHERE id = 42',
      locks_held: ['ShareLock on users'],
      locks_waiting: ['ShareLock on accounts'],
      inCycle: true,
      application: 'app-worker',
      username: 'postgres'
    },
    {
      id: 'process_13579',
      label: 'Process 13579',
      type: 'process',
      tables: ['accounts'],
      query: 'SELECT * FROM accounts WHERE id = 100',
      locks_held: [],
      locks_waiting: [],
      inCycle: false,
      application: 'app-api',
      username: 'readonly'
    },
    {
      id: 'table_users',
      label: 'users',
      type: 'table',
      inCycle: true
    },
    {
      id: 'table_accounts',
      label: 'accounts',
      type: 'table',
      inCycle: true
    },
    {
      id: 'table_transactions',
      label: 'transactions',
      type: 'table',
      inCycle: false
    }
  ],
  edges: [
    {
      source: 'process_12345',
      target: 'process_67890',
      label: 'waits for',
      details: 'ShareLock on users',
      inCycle: true
    },
    {
      source: 'process_67890',
      target: 'process_12345',
      label: 'waits for',
      details: 'ShareLock on accounts',
      inCycle: true
    },
    {
      source: 'process_13579',
      target: 'table_accounts',
      label: 'accesses',
      inCycle: false
    },
    {
      source: 'process_12345',
      target: 'table_accounts',
      label: 'accesses',
      inCycle: false
    },
    {
      source: 'process_12345',
      target: 'table_users',
      label: 'accesses',
      inCycle: false
    },
    {
      source: 'process_67890',
      target: 'table_users',
      label: 'accesses',
      inCycle: false
    },
    {
      source: 'process_67890',
      target: 'table_transactions',
      label: 'accesses',
      inCycle: false
    }
  ],
  cycles: [
    {
      processes: [12345, 67890],
      relations: ['users', 'accounts'],
      severity: 75
    }
  ],
  severity: 75
};

// Define transaction data
const MOCK_TRANSACTIONS = {
  '12345': {
    process_id: 12345,
    query: 'UPDATE accounts SET balance = balance - 100 WHERE user_id = 42',
    tables_accessed: ['users', 'accounts'],
    locks_held: ['ShareLock on accounts'],
    locks_waiting: ['ShareLock on users'],
    application_name: 'app-backend',
    username: 'postgres',
    query_fingerprint: {
      hash: 'a1b2c3d4e5f6g7h8i9j0'
    }
  },
  '67890': {
    process_id: 67890,
    query: 'UPDATE users SET last_login = now() WHERE id = 42',
    tables_accessed: ['users', 'transactions'],
    locks_held: ['ShareLock on users'],
    locks_waiting: ['ShareLock on accounts'],
    application_name: 'app-worker',
    username: 'postgres',
    query_fingerprint: {
      hash: '1a2b3c4d5e6f7g8h9i0j'
    }
  }
};

// Define locks data
const MOCK_LOCKS = [
  {
    lock_type: 'relation',
    relation: 'accounts',
    lock_mode: 'ShareLock',
    granted: true,
    process_id: 12345
  },
  {
    lock_type: 'relation',
    relation: 'users',
    lock_mode: 'ShareLock',
    granted: false,
    process_id: 12345
  },
  {
    lock_type: 'relation',
    relation: 'users',
    lock_mode: 'ShareLock',
    granted: true,
    process_id: 67890
  },
  {
    lock_type: 'relation',
    relation: 'accounts',
    lock_mode: 'ShareLock',
    granted: false,
    process_id: 67890
  }
];

// Define cycles data
const MOCK_CYCLES = [
  {
    processes: [12345, 67890],
    relations: ['users', 'accounts'],
    severity: 75
  }
];

// Define full analysis data object last, after all its dependencies are defined
const MOCK_ANALYSIS_DATA = {
  visualization_data: MOCK_VISUALIZATION_DATA,
  recommended_fix: MOCK_RECOMMENDATION,
  transactions: MOCK_TRANSACTIONS,
  locks: MOCK_LOCKS,
  cycles: MOCK_CYCLES,
  timestamp: new Date().toISOString()
};

/**
 * Mock implementation for local development
 * This will be replaced with real API calls in production
 */
export async function mockAnalyzeDeadlock(eventId, options = {}) {
  console.log(`[Mock] Analyzing deadlock for event ${eventId} with options:`, options);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return different mock data based on options
  if (options.useEnhancedAnalysis) {
    return {
      analysis: {
        ...MOCK_ANALYSIS_DATA,
        visualization_data: {
          ...MOCK_VISUALIZATION_DATA,
          severity: 75  // Enhanced version includes severity score
        },
        metadata: {
          execution_time_ms: 235,
          parser_version: "enhanced-1.0.0",
          cycles_found: 1,
          severity_score: 75
        }
      }
    };
  } else {
    return {
      analysis: MOCK_ANALYSIS_DATA
    };
  }
}
