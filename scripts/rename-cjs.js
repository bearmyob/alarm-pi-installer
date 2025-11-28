const fs = require('fs');
const path = require('path');

const distElectron = path.join(__dirname, '../dist-electron');

// Rename .js files to .cjs
const files = fs.readdirSync(distElectron);
files.forEach(file => {
  if (file.endsWith('.js')) {
    const oldPath = path.join(distElectron, file);
    const newPath = path.join(distElectron, file.replace('.js', '.cjs'));
    
    // Read file and update any require paths
    let content = fs.readFileSync(oldPath, 'utf8');
    content = content.replace(/require\("\.\/(\w+)\.js"\)/g, 'require("./$1.cjs")');
    content = content.replace(/preload\.js/g, 'preload.cjs');
    
    fs.writeFileSync(newPath, content);
    fs.unlinkSync(oldPath);
    console.log(`Renamed ${file} -> ${file.replace('.js', '.cjs')}`);
  }
});

console.log('Done renaming to .cjs');

