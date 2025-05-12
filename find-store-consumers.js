// find-store-consumers.js
// Purpose: Find all components that import from the store

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.resolve(__dirname, 'frontend/src');
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', '.git'];
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Store consumers
let storeConsumers = [];

/**
 * Check a file for store imports
 * @param {string} filePath File to check
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file imports the store
    if (content.includes('from') && 
        (content.includes('/store/appStore') || 
         content.includes('/appStore') || 
         content.includes('useAppStore'))) {
      
      storeConsumers.push(filePath);
      
      // Check which properties are used
      const propertyUsage = {
        file: filePath,
        properties: []
      };
      
      // Check for old property usage
      const oldProperties = [
        'issueStatusFilter',
        'issueSearchTerm',
        'setIssueStatusFilter',
        'setIssueSearchTerm'
      ];
      
      oldProperties.forEach(prop => {
        if (content.includes(prop)) {
          propertyUsage.properties.push(prop);
        }
      });
      
      if (propertyUsage.properties.length > 0) {
        console.log(`\nFile: ${path.relative(process.cwd(), filePath)}`);
        console.log(`  Uses old properties: ${propertyUsage.properties.join(', ')}`);
      }
    }
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
  }
}

/**
 * Recursively process directory
 * @param {string} dir Directory to process
 */
function processDirectory(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      // Skip excluded directories
      if (EXCLUDED_DIRS.includes(item)) {
        continue;
      }
      
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        processDirectory(itemPath);
      } else if (FILE_EXTENSIONS.includes(path.extname(item))) {
        checkFile(itemPath);
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}: ${err.message}`);
  }
}

// Start the scan
console.log('Scanning for store consumers...');
processDirectory(SRC_DIR);

// Report results
console.log('\n--- STORE CONSUMERS SUMMARY ---');
console.log(`\nFound ${storeConsumers.length} files importing the store`);

// Exit with status code 0
process.exit(0);