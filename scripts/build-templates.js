// Build script to generate templateFiles.ts from the react-template directory
// This script is OPTIONAL and only needed if you want to include react-template files 
// as embedded templates in the main application. It does NOT affect the standalone
// functionality of the react-template project itself.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your template folder
const templateDir = path.join(__dirname, '../react-template');
// Output path
const outputPath = path.join(__dirname, '../artifacts/code/utils/templateFiles.ts');

// Function to recursively read directory
function readDirRecursive(dir, baseDir = '') {
  const files = {};
  
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.join(baseDir, file).replace(/\\/g, '/');
    const stat = fs.statSync(filePath);
    
    // Skip node_modules and other unnecessary files
    if (
      file === 'node_modules' || 
      file === '.git' || 
      file.startsWith('.') ||
      file === 'package-lock.json'
    ) {
      return;
    }
    
    if (stat.isDirectory()) {
      const nestedFiles = readDirRecursive(filePath, relativePath);
      Object.assign(files, nestedFiles);
    } else {
      // Read file contents
      const contents = fs.readFileSync(filePath, 'utf8');
      
      // Format for templateFiles.ts
      files[relativePath] = {
        file: {
          contents
        }
      };
    }
  });
  
  return files;
}

// Ensure directories exist
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  // Generate the template files object
  const templateFiles = readDirRecursive(templateDir);

  // Generate the output file
  const output = `// Auto-generated from react-template directory - DO NOT EDIT DIRECTLY
export const reactTemplateFiles = ${JSON.stringify(templateFiles, null, 2)};
`;

  fs.writeFileSync(outputPath, output);
  console.log(`Template files generated at ${outputPath}`);
} catch (error) {
  console.error('Error generating template files:', error);
  process.exit(1);
} 