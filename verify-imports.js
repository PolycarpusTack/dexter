// verify-imports.js
// Purpose: Find all imports that still use file extensions

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.resolve(__dirname, 'frontend/src');
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', '.git'];
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Store problematic imports
let appStoreProblems = [];
let themeProblems = [];

/**
 * Check a file for problematic imports
 * @param {string} filePath File to check
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineNumber) => {
      // Check for appStore imports with extensions
      if (line.match(/from\s+['"].*\/appStore\.(js|jsx|ts|tsx)['"]/)) {
        appStoreProblems.push({
          file: filePath,
          line: lineNumber + 1,
          content: line.trim()
        });
      }
      
      // Check for theme imports with extensions
      if (line.match(/from\s+['"].*\/theme\/theme\.(js|jsx|ts|tsx)['"]/)) {
        themeProblems.push({
          file: filePath,
          line: lineNumber + 1,
          content: line.trim()
        });
      }
    });
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
console.log('Scanning for problematic imports...');
processDirectory(SRC_DIR);

// Report results
console.log('\n--- SCAN RESULTS ---');

if (appStoreProblems.length === 0) {
  console.log('\nNo appStore imports with extensions found! ✅');
} else {
  console.log(`\nFound ${appStoreProblems.length} problematic appStore imports:`);
  appStoreProblems.forEach(problem => {
    const relativePath = path.relative(process.cwd(), problem.file);
    console.log(`${relativePath}:${problem.line} - ${problem.content}`);
  });
}

if (themeProblems.length === 0) {
  console.log('\nNo theme imports with extensions found! ✅');
} else {
  console.log(`\nFound ${themeProblems.length} problematic theme imports:`);
  themeProblems.forEach(problem => {
    const relativePath = path.relative(process.cwd(), problem.file);
    console.log(`${relativePath}:${problem.line} - ${problem.content}`);
  });
}

const totalProblems = appStoreProblems.length + themeProblems.length;
if (totalProblems === 0) {
  console.log('\nAll imports are clean! ✅');
} else {
  console.log(`\nTotal problems found: ${totalProblems} ❌`);
  console.log('\nTo fix these issues:');
  console.log('1. Remove file extensions from imports');
  console.log('2. Update any renamed properties (e.g., issueStatusFilter → statusFilter)');
}

// Exit with status code based on problems found
process.exit(totalProblems > 0 ? 1 : 0);