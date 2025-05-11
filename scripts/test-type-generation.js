#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing API type generation...\n');

// Check if generated files exist
const frontendTypesPath = path.join(__dirname, '../frontend/src/types/api/sentry.ts');
const backendModelsPath = path.join(__dirname, '../backend/app/models/api/sentry.py');

let success = true;

// Check frontend types
if (fs.existsSync(frontendTypesPath)) {
  console.log('✓ Frontend TypeScript types generated successfully');
  console.log(`  Path: ${frontendTypesPath}`);
  
  // Check if the file has content
  const content = fs.readFileSync(frontendTypesPath, 'utf8');
  if (content.length > 100) {
    console.log(`  Size: ${content.length} bytes`);
  } else {
    console.error('  ⚠ Warning: File seems too small');
    success = false;
  }
} else {
  console.error('✗ Frontend TypeScript types not found');
  success = false;
}

console.log('');

// Check backend models
if (fs.existsSync(backendModelsPath)) {
  console.log('✓ Backend Pydantic models generated successfully');
  console.log(`  Path: ${backendModelsPath}`);
  
  // Check if the file has content
  const content = fs.readFileSync(backendModelsPath, 'utf8');
  if (content.length > 100) {
    console.log(`  Size: ${content.length} bytes`);
  } else {
    console.error('  ⚠ Warning: File seems too small');
    success = false;
  }
} else {
  console.error('✗ Backend Pydantic models not found');
  success = false;
}

console.log('');

if (success) {
  console.log('✅ Type generation test passed!');
  process.exit(0);
} else {
  console.error('❌ Type generation test failed!');
  process.exit(1);
}
