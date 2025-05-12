// This script removes JavaScript versions of API modules
// Save this as 'cleanup-js-files.js' and run with Node.js

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const unlink = promisify(fs.unlink);
const exists = promisify(fs.access);

// Define files to be removed
const filesToRemove = [
  'aiApi.js',
  'analyticsApi.js',
  'eventsApi.js',
  'issuesApi.js', 
  'modelApi.js',
  'config.js',
  'deadlockApi.js',
  'enhancedDeadlockApi.js',
  'index.js',
  'apiClientExample.js',
  'configApi.js',
  'exportApi.js',
  'mockData.js'
];

// Main function
async function main() {
  try {
    // Define the API directory path (adjust as needed)
    const apiDir = path.resolve(__dirname, '../frontend/src/api');
    console.log(`Cleaning up JavaScript files in: ${apiDir}`);
    
    let removedCount = 0;
    
    // Process each file
    for (const file of filesToRemove) {
      const filePath = path.join(apiDir, file);
      
      try {
        // Check if file exists
        await exists(filePath, fs.constants.F_OK);
        
        // Remove the file
        await unlink(filePath);
        console.log(`✓ Removed: ${file}`);
        removedCount++;
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`File not found: ${file}`);
        } else {
          console.error(`Error removing ${file}:`, error);
        }
      }
    }
    
    console.log(`\nCleanup completed. Removed ${removedCount} files.`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the script
main();
