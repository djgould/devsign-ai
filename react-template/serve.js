import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files
app.use(express.static(__dirname));

// API endpoint to get the React template files
app.get('/api/react-template', (req, res) => {
  try {
    const templateFilesPath = path.join(__dirname, 'react-template-files.json');
    if (fs.existsSync(templateFilesPath)) {
      const templateFiles = JSON.parse(fs.readFileSync(templateFilesPath, 'utf8'));
      res.json(templateFiles);
    } else {
      res.status(404).json({ error: 'Template files not found' });
    }
  } catch (error) {
    console.error('Error serving template files:', error);
    res.status(500).json({ error: 'Failed to serve template files' });
  }
});

// Serve the react-renderer.js file directly
app.get('/react-renderer.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'react-renderer.js'));
});

app.listen(PORT, () => {
  console.log(`React template server running at http://localhost:${PORT}`);
  console.log(`Access template files at http://localhost:${PORT}/api/react-template`);
  console.log(`Access renderer at http://localhost:${PORT}/react-renderer.js`);
}); 