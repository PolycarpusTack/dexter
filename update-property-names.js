// update-property-names.js
// Purpose: Update old property names to new ones

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.resolve(__dirname, 'frontend/src');
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', '.git'];
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Property mappings
const PROPERTY_MAPPINGS = [
  { old: 'issueStatusFilter', new: 'statusFilter' },
  { old: 'issueSearchTerm', new: 'searchQuery' },
  { old: 'setIssueStatusFilter', new: 'setStatusFilter' },
  { old: 'setIssueSearchTerm', new: 'setSearchQuery' }
];

// Store updated files
let updatedFiles = [];

/**
 * Update a file with new property names
 * @param {string} filePath File to update
 */
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    PROPERTY_MAPPINGS.forEach(mapping => {
      if (content.includes(mapping.old)) {
        // Replace all occurrences
        const oldContent = content;
        content = content.split(mapping.old).join(mapping.new);
        
        if (oldContent !== content) {
          updated = true;
        }
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedFiles.push(filePath);
    }
  } catch (err) {
    console.error(`Error updating ${filePath}: ${err.message}`);
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
        updateFile(itemPath);
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}: ${err.message}`);
  }
}

// Start the update
console.log('Updating property names...');
processDirectory(SRC_DIR);

// Report results
console.log('\n--- UPDATE RESULTS ---');

if (updatedFiles.length === 0) {
  console.log('\nNo files were updated.');
} else {
  console.log(`\nUpdated ${updatedFiles.length} files:`);
  updatedFiles.forEach(file => {
    console.log(`- ${path.relative(process.cwd(), file)}`);
  });
}

// Exit with status code 0
process.exit(0);