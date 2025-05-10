const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized production build...\n');

try {
  // 1. Clean the dist directory
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true });
    console.log('✅ Cleaned dist directory');
  }

  // 2. Run TypeScript compile
  console.log('\n📦 Compiling TypeScript...');
  execSync('tsc', { stdio: 'inherit' });

  // 3. Run Vite build with production optimizations
  console.log('\n📦 Building for production...');
  execSync('cross-env NODE_ENV=production vite build', { stdio: 'inherit' });

  // 4. Analyze bundle size
  console.log('\n📊 Bundle Analysis:');
  const stats = fs.readdirSync(path.join(distPath, 'assets/js'))
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const stat = fs.statSync(path.join(distPath, 'assets/js', file));
      return {
        name: file,
        size: (stat.size / 1024).toFixed(2) + ' KB',
        gzipSize: (stat.size / 1024 / 3).toFixed(2) + ' KB (estimated)'
      };
    });

  console.table(stats);

  // 5. Create a production report
  const report = {
    buildTime: new Date().toISOString(),
    files: stats,
    totalSize: stats.reduce((acc, file) => acc + parseFloat(file.size), 0).toFixed(2) + ' KB',
    environment: 'production',
    optimizations: {
      codeSpitting: true,
      minification: true,
      treeShaking: true,
      chunks: ['react-vendor', 'mantine-vendor', 'query-vendor', 'd3-vendor', 'icons-vendor']
    }
  };

  fs.writeFileSync(
    path.join(distPath, 'build-report.json'), 
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Build completed successfully!');
  console.log(`📁 Output directory: ${distPath}`);
  console.log(`📋 Build report: ${path.join(distPath, 'build-report.json')}`);

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
