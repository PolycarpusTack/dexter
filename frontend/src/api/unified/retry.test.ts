/**
 * Tests for the Retry Manager
 */
import { RetryManager } from './retryManager';

// Create test instance
const retryManager = new RetryManager({
  maxRetries: 3,
  initialDelay: 10,
  maxDelay: 1000,
  backoffMultiplier: 2,
});

// Test successful execution
console.log('--- Testing successful execution ---');
let executionCount = 0;

async function successfulOperation() {
  executionCount++;
  console.log(`Execution attempt ${executionCount}`);
  return 'Success!';
}

// Test retry on failure
console.log('--- Testing retry on failure ---');
let failureCount = 0;

async function failingOperation() {
  failureCount++;
  console.log(`Failure attempt ${failureCount}`);
  
  if (failureCount < 3) {
    throw new Error('Temporary failure');
  }
  
  return 'Finally succeeded!';
}

// Test non-retryable error
console.log('--- Testing non-retryable error ---');
async function nonRetryableOperation() {
  throw new Error('Critical error');
}

// Run tests
async function runTests() {
  try {
    // Test 1: Successful operation
    const successResult = await retryManager.execute(successfulOperation);
    console.log('Success result:', successResult);
    console.log('Execution count:', executionCount);
    
    // Test 2: Failing operation with retry
    const retryResult = await retryManager.execute(failingOperation, {
      onRetry: (ctx) => {
        console.log(`Retrying after failure: ${ctx.error.message}, attempt: ${ctx.attempt}, delay: ${ctx.delay}ms`);
      }
    });
    console.log('Retry result:', retryResult);
    console.log('Failure count:', failureCount);
    
    // Test 3: Non-retryable error
    try {
      await retryManager.execute(nonRetryableOperation, {
        retryCondition: () => false, // Never retry
      });
    } catch (error) {
      console.log('Non-retryable error caught:', error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests().then(() => {
  console.log('All tests completed');
});