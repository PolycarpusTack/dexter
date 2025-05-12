// This script updates import statements to use TypeScript versions of API modules
// Save this as 'update-imports.js' and run with Node.js

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Define API modules to migrate
const apiModules = [
  'aiApi',
  'analyticsApi',
  'eventsApi',
  'issuesApi',
  'modelApi',
  'deadlockApi',
  'enhancedDeadlockApi',
  'config'
];

// Regex patterns for imports
const importPatterns = apiModules.map(module => ({
  module,
  // Match imports without file extension specified
  pattern: new RegExp(`import\\s+(.*)\\s+from\\s+(['"])(.*/|)${module}(['"])`, 'g'),
  // Don't add .ts explicitly since TypeScript resolves module imports without extensions
  replacement: `import $1 from $2$3${module}$4`
}));

// Function to process a file
async function processFile(filePath) {
  try {
    // Read file content
    const content = await readFile(filePath, 'utf8');
    let newContent = content;
    let changed = false;

    // Apply all regex replacements
    for (const { pattern, replacement, module } of importPatterns) {
      // Only replace if pattern matches and doesn't already include '.ts'
      if (pattern.test(newContent) && !newContent.includes(`${module}.ts`)) {
        newContent = newContent.replace(pattern, replacement);
        changed = true;
      }
    }

    // Write updated file if changes were made
    if (changed) {
      await writeFile(filePath, newContent, 'utf8');
      console.log(`Updated imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Function to recursively scan directories
async function scanDirectory(directory) {
  const entries = await readdir(directory);

  for (const entry of entries) {
    const entryPath = path.join(directory, entry);
    const entryStat = await stat(entryPath);

    if (entryStat.isDirectory()) {
      // Skip node_modules and .git directories
      if (entry !== 'node_modules' && entry !== '.git') {
        await scanDirectory(entryPath);
      }
    } else if (
      // Only process JavaScript and TypeScript files
      entryStat.isFile() && 
      (entry.endsWith('.js') || 
       entry.endsWith('.jsx') || 
       entry.endsWith('.ts') || 
       entry.endsWith('.tsx'))
    ) {
      await processFile(entryPath);
    }
  }
}

// Main function
async function main() {
  try {
    // Define the root directory to scan (adjust as needed)
    const rootDir = path.resolve(__dirname, '../frontend/src');
    console.log(`Scanning directory: ${rootDir}`);
    
    await scanDirectory(rootDir);
    console.log('Import update completed successfully!');
  } catch (error) {
    console.error('Error updating imports:', error);
  }
}

// Run the script
main();
