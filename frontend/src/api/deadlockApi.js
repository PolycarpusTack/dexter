// File: src/api/deadlockApi.js

/**
 * API functions for deadlock analysis
 */
import axios from 'axios';
import { showErrorNotification } from '../utils/errorHandling';

// API base URL from environment or default to localhost
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Analyze a deadlock for a specific event
 * @param {string} eventId - The ID of the event to analyze
 * @returns {Promise<object>} - The deadlock analysis result
 */
export async function analyzeDeadlock(eventId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/analyze-deadlock/${eventId}`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
    console.error(`Error analyzing deadlock for event ${eventId}:`, errorMessage);
    
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
 * Export deadlock visualization as SVG
 * @param {string} eventId - The ID of the event
 * @param {SVGElement} svgElement - The SVG element to export
 */
export function exportDeadlockSVG(eventId, svgElement) {
  if (!svgElement) return;
  
  try {
    // Create a copy of the SVG element
    const svgCopy = svgElement.cloneNode(true);
    
    // Add some metadata and styling
    svgCopy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgCopy.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    // Remove any transform applied by zoom
    const transformElement = svgCopy.querySelector('g');
    if (transformElement) {
      transformElement.removeAttribute('transform');
    }
    
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

/**
 * Mock implementation for local development
 * This will be replaced with real API calls in production
 */
export async function mockAnalyzeDeadlock(eventId) {
  console.log(`[Mock] Analyzing deadlock for event ${eventId}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    analysis: {
      visualization_data: MOCK_VISUALIZATION_DATA,
      recommended_fix: MOCK_RECOMMENDATION,
      transactions: MOCK_TRANSACTIONS,
      locks: MOCK_LOCKS,
      cycles: MOCK_CYCLES
    }
  };
}

// Mock data for development
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
      inCycle: true
    },
    {
      id: 'process_67890',
      label: 'Process 67890',
      type: 'process',
      tables: ['users', 'transactions'],
      query: 'UPDATE users SET last_login = now() WHERE id = 42',
      locks_held: ['ShareLock on users'],
      locks_waiting: ['ShareLock on accounts'],
      inCycle: true
    },
    {
      id: 'process_13579',
      label: 'Process 13579',
      type: 'process',
      tables: ['accounts'],
      query: 'SELECT * FROM accounts WHERE id = 100',
      locks_held: [],
      locks_waiting: [],
      inCycle: false
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
      relations: ['users', 'accounts']
    }
  ]
};

const MOCK_TRANSACTIONS = {
  '12345': {
    process_id: 12345,
    query: 'UPDATE accounts SET balance = balance - 100 WHERE user_id = 42',
    tables_accessed: ['users', 'accounts'],
    locks_held: ['ShareLock on accounts'],
    locks_waiting: ['ShareLock on users']
  },
  '67890': {
    process_id: 67890,
    query: 'UPDATE users SET last_login = now() WHERE id = 42',
    tables_accessed: ['users', 'transactions'],
    locks_held: ['ShareLock on users'],
    locks_waiting: ['ShareLock on accounts']
  }
};

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

const MOCK_CYCLES = [
  {
    processes: [12345, 67890],
    relations: ['users', 'accounts']
  }
];

const MOCK_RECOMMENDATION = `
## Deadlock Analysis

This deadlock involves **2** processes that were attempting to access the following tables: **users, accounts**.

### Root Cause

The deadlock occurred because multiple transactions were trying to acquire locks on the same tables but in different orders, creating a circular waiting pattern.

### Recommended Solutions

1. **Consistent Access Order**: Ensure all transactions access tables in the same order:
   \`\`\`
   accounts → users
   \`\`\`

2. **Transaction Scope**: Reduce the scope of transactions to minimize lock contention:
   - Keep transactions as short as possible
   - Only lock the tables you actually need to modify

3. **Lock Mode Optimization**: Consider using less restrictive lock modes:
   - Use \`FOR SHARE\` instead of \`FOR UPDATE\` when possible
   - Use \`NOWAIT\` option to fail fast rather than deadlock

4. **Application Changes**: Review application code that accesses these tables:
   - Look for functions/methods that update multiple tables
   - Ensure all code paths use consistent table access ordering
   - Consider using advisory locks for complex operations

5. **Database Configuration**:
   - Review and possibly adjust \`deadlock_timeout\` setting
   - Consider setting appropriate \`statement_timeout\` to prevent long-running transactions
`;
