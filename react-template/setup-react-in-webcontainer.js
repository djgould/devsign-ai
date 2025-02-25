/**
 * This script prepares a Vite + React + shadcn/ui template for execution in a WebContainer
 * It packages all the necessary files in a format that can be loaded into the WebContainer
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to recursively get all files in a directory
function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules
      if (file === 'node_modules') continue;
      getFiles(filePath, filesList);
    } else {
      filesList.push({
        path: filePath,
        content: fs.readFileSync(filePath, 'utf8')
      });
    }
  }
  
  return filesList;
}

// Main function to generate the template files JSON
function generateTemplateFilesJSON() {
  // Get all files in the template directory
  const files = getFiles('.');
  
  // Convert to a map format suitable for WebContainer
  const filesMap = {};
  
  for (const file of files) {
    // Get the relative path
    const relativePath = path.relative('.', file.path);
    // Skip this script itself and any generated bundle files
    if (relativePath === 'setup-react-in-webcontainer.js' || 
        relativePath === 'react-template-files.json' ||
        relativePath.startsWith('dist/') ||
        relativePath.startsWith('.')) {
      continue;
    }
    
    filesMap[relativePath] = { file: { contents: file.content } };
  }
  
  // Add a special README file explaining the template
  filesMap['README.md'] = {
    file: {
      contents: `# React in WebContainer Template
      
This is a minimal Vite + React + shadcn/ui template that can be loaded into a WebContainer.

## Features
- React 18
- TypeScript
- Vite for fast rebuilds
- Tailwind CSS for styling
- shadcn/ui components
- Hot Module Replacement

## Getting Started
Run the development server:

\`\`\`
npm install
npm run dev
\`\`\`
`
    }
  };
  
  // Write the files map to a JSON file
  fs.writeFileSync('react-template-files.json', JSON.stringify(filesMap, null, 2));
  console.log('Template files JSON generated successfully!');
}

// Run the main function
generateTemplateFilesJSON(); 