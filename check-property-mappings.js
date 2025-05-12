// check-property-mappings.js
// Purpose: Find all usages of old property names

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.resolve(__dirname, 'frontend/src');
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', '.git'];
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Properties to check
const PROPERTY_MAPPINGS = [
  { old: 'issueStatusFilter', new: 'statusFilter' },
  { old: 'issueSearchTerm', new: 'searchQuery' },
  { old: 'setIssueStatusFilter', new: 'setStatusFilter' },
  { old: 'setIssueSearchTerm', new: 'setSearchQuery' }
];

// Store problematic usages
let problems = [];

/**
 * Check a file for old property names
 * @param {string} filePath File to check
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, lineNumber) => {
      PROPERTY_MAPPINGS.forEach(mapping => {
        if (line.includes(mapping.old)) {
          problems.push({
            file: filePath,
            line: lineNumber + 1,
            oldProp: mapping.old,
            newProp: mapping.new,
            content: line.trim()
          });
        }
      });
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
console.log('Scanning for old property names...');
processDirectory(SRC_DIR);

// Report results
console.log('\n--- SCAN RESULTS ---');

if (problems.length === 0) {
  console.log('\nNo old property names found! ✅');
} else {
  console.log(`\nFound ${problems.length} uses of old property names:`);
  problems.forEach(problem => {
    const relativePath = path.relative(process.cwd(), problem.file);
    console.log(`${relativePath}:${problem.line} - ${problem.oldProp} → ${problem.newProp}`);
    console.log(`  ${problem.content}`);
  });
  
  console.log('\nTo fix these issues:');
  PROPERTY_MAPPINGS.forEach(mapping => {
    console.log(`- Replace all occurrences of ${mapping.old} with ${mapping.new}`);
  });
}

// Exit with status code based on problems found
process.exit(problems.length > 0 ? 1 : 0);