const { build } = require('vite');
const path = require('path');

async function main() {
  try {
    console.log('Building only templateApi.ts...');
    
    await build({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      root: __dirname,
      build: {
        minify: false,
        write: false,
        rollupOptions: {
          input: './src/api/unified/templateApi.ts',
          output: {
            dir: 'dist-check',
            format: 'esm'
          }
        }
      }
    });
    
    console.log('Build successful! The templateApi.ts file compiles without errors.');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();