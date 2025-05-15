/**
 * Fix ESM compatibility issues with the frontend
 */
const fs = require('fs');
const path = require('path');

// Helper to read and parse package.json
function readPackageJson(pkgPath) {
  const content = fs.readFileSync(pkgPath, 'utf8');
  return JSON.parse(content);
}

// Helper to write package.json
function writePackageJson(pkgPath, pkg) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log(`Updated ${pkgPath}`);
}

// Main function to fix ESM/CommonJS issues
function fixEsmCompatibility() {
  console.log('Fixing ESM compatibility issues...');
  
  try {
    // 1. Update package.json
    const packageJsonPath = path.resolve(__dirname, 'package.json');
    const pkg = readPackageJson(packageJsonPath);

    // Add module type
    pkg.type = 'module';
    
    // Update dependencies if needed
    if (pkg.dependencies['@tanstack/react-query']) {
      console.log('Downgrading React Query for better compatibility');
      pkg.dependencies['@tanstack/react-query'] = '^4.36.1';
      pkg.dependencies['@tanstack/react-query-devtools'] = '^4.36.1';
    }
    
    writePackageJson(packageJsonPath, pkg);
    
    // 2. Create .babelrc if it doesn't exist
    const babelrcPath = path.resolve(__dirname, '.babelrc');
    if (!fs.existsSync(babelrcPath)) {
      const babelConfig = {
        "presets": [
          ["@babel/preset-env", { "targets": { "node": "current" } }],
          ["@babel/preset-react", { "runtime": "automatic" }],
          ["@babel/preset-typescript", { "isTSX": true, "allExtensions": true }]
        ],
        "plugins": [
          ["@babel/plugin-transform-react-jsx", { "runtime": "automatic" }]
        ]
      };
      
      fs.writeFileSync(babelrcPath, JSON.stringify(babelConfig, null, 2), 'utf8');
      console.log('Created .babelrc configuration');
    }
    
    console.log('\nESM compatibility fixes applied successfully.');
    console.log('\nNext steps:');
    console.log('1. Run: npm install --legacy-peer-deps');
    console.log('2. Run: npm run dev');
    
  } catch (error) {
    console.error('Error fixing ESM compatibility:', error);
    process.exit(1);
  }
}

// Run the function
fixEsmCompatibility();