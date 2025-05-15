// Simple helper to update imports for pathResolver
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname, 'src', 'api', 'unified');
const filesToUpdate = fs.readdirSync(directoryPath).filter(file => 
  !file.endsWith('pathResolver.ts') && !file.endsWith('pathResolver.js')
);

filesToUpdate.forEach(file => {
  const filePath = path.join(directoryPath, file);
  if (fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace imports of pathResolver.ts with pathResolver.js
    const updatedContent = content.replace(
      /from ['"]\.\/pathResolver['"]/g, 
      `from './pathResolver.js'`
    );
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated imports in ${file}`);
    }
  }
});

console.log('Import update completed!');
