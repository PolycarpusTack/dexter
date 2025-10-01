import { build } from 'vite';
import path from 'path';

async function main() {
  try {
    console.log('Building only templateApi.ts...');
    
    await build({
      configFile: path.resolve(process.cwd(), 'vite.config.ts'),
      root: process.cwd(),
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