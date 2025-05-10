const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Building with source-map for analysis...\n');

try {
  // Build with sourcemap for analysis
  execSync('cross-env GENERATE_SOURCEMAP=true vite build', { stdio: 'inherit' });
  
  console.log('\n📊 Analyzing bundle size...\n');
  
  // Run bundle analyzer
  const distPath = path.join(__dirname, '../dist');
  execSync(`npx source-map-explorer "${distPath}/assets/js/*.js"`, { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Build analysis failed:', error.message);
  process.exit(1);
}
