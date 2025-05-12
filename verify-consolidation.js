// verify-consolidation.js
// Purpose: Final verification of the TypeScript consolidation

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.resolve(__dirname, 'frontend/src');
const STORE_PATH = path.join(SRC_DIR, 'store', 'appStore.ts');
const THEME_PATH = path.join(SRC_DIR, 'theme', 'theme.ts');

// Check if files exist
console.log('Verifying files existence...');

// Check TypeScript files
const tsFilesStatus = {
  store: fs.existsSync(STORE_PATH),
  theme: fs.existsSync(THEME_PATH)
};

// Check JavaScript files (should be removed)
const jsFilesStatus = {
  storeJs: fs.existsSync(path.join(SRC_DIR, 'store', 'appStore.js')),
  storeJsx: fs.existsSync(path.join(SRC_DIR, 'store', 'appStore.jsx')),
  themeJs: fs.existsSync(path.join(SRC_DIR, 'theme', 'theme.js'))
};

// Results
console.log('\n--- FILE VERIFICATION ---');
console.log('\nTypeScript files:');
console.log(`- store/appStore.ts: ${tsFilesStatus.store ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`- theme/theme.ts: ${tsFilesStatus.theme ? '✅ EXISTS' : '❌ MISSING'}`);

console.log('\nJavaScript files (should be removed):');
console.log(`- store/appStore.js: ${jsFilesStatus.storeJs ? '❌ EXISTS (should be removed)' : '✅ REMOVED'}`);
console.log(`- store/appStore.jsx: ${jsFilesStatus.storeJsx ? '❌ EXISTS (should be removed)' : '✅ REMOVED'}`);
console.log(`- theme/theme.js: ${jsFilesStatus.themeJs ? '❌ EXISTS (should be removed)' : '✅ REMOVED'}`);

// Check content of TypeScript files
if (tsFilesStatus.store && tsFilesStatus.theme) {
  console.log('\n--- CONTENT VERIFICATION ---');
  
  // Read store file
  const storeContent = fs.readFileSync(STORE_PATH, 'utf8');
  
  // Check for required properties and functions
  console.log('\nStore features:');
  
  const storeFeatures = [
    { name: 'latestEventsByIssue', present: storeContent.includes('latestEventsByIssue') },
    { name: 'storeLatestEventId', present: storeContent.includes('storeLatestEventId') },
    { name: 'resetFilters', present: storeContent.includes('resetFilters') },
    { name: 'setConfig', present: storeContent.includes('setConfig') },
    { name: 'clearSelection', present: storeContent.includes('clearSelection') }
  ];
  
  storeFeatures.forEach(feature => {
    console.log(`- ${feature.name}: ${feature.present ? '✅ PRESENT' : '❌ MISSING'}`);
  });
  
  // Read theme file
  const themeContent = fs.readFileSync(THEME_PATH, 'utf8');
  
  // Check for required properties
  console.log('\nTheme features:');
  
  const themeFeatures = [
    { name: 'background colors', present: themeContent.includes('background: colors.neutral[50]') },
    { name: 'surface color', present: themeContent.includes('surface: \'white\'') },
    { name: 'border color', present: themeContent.includes('border: colors.neutral[300]') },
    { name: 'MantineThemeOverride type', present: themeContent.includes('MantineThemeOverride') }
  ];
  
  themeFeatures.forEach(feature => {
    console.log(`- ${feature.name}: ${feature.present ? '✅ PRESENT' : '❌ MISSING'}`);
  });
}

// Summary
console.log('\n--- SUMMARY ---');

const allTsFilesExist = tsFilesStatus.store && tsFilesStatus.theme;
const allJsFilesRemoved = !jsFilesStatus.storeJs && !jsFilesStatus.storeJsx && !jsFilesStatus.themeJs;

if (allTsFilesExist && allJsFilesRemoved) {
  console.log('\n✅ CONSOLIDATION SUCCESSFUL!');
  console.log('All TypeScript files exist and all JavaScript files have been removed.');
} else {
  console.log('\n❌ CONSOLIDATION INCOMPLETE');
  
  if (!allTsFilesExist) {
    console.log('Some TypeScript files are missing.');
  }
  
  if (!allJsFilesRemoved) {
    console.log('Some JavaScript files still exist and should be removed.');
  }
}