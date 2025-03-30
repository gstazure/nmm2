const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    console.log(`Created/Updated: ${filePath}`);
}

// Add your files here
const files = {
    'client/index.html': fs.readFileSync('client/index.html', 'utf8'),
    'client/styles.css': fs.readFileSync('client/styles.css', 'utf8'),
    'client/game.js': fs.readFileSync('client/game.js', 'utf8')
};

// Create/update all files
Object.entries(files).forEach(([filePath, content]) => {
    writeFile(path.join(__dirname, filePath), content);
});