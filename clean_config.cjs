const fs = require('fs');
let content = fs.readFileSync('next.config.ts', 'utf8');
content = content.trim();
if (content.startsWith('\"')) content = content.slice(1);
if (content.endsWith('\"')) content = content.slice(0, -1);
fs.writeFileSync('next.config.ts', content, 'utf8');
console.log('Cleaned');
