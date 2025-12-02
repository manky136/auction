// Build script to inject API URL into HTML files
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const publicDir = path.join(__dirname, 'public');

const htmlFiles = ['index.html', 'admin.html', 'user.html'];

htmlFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the placeholder with actual API URL
    content = content.replace(/<!-- API_URL -->/g, API_URL);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file} with API URL: ${API_URL}`);
});

