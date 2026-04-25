const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'repositories', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "  name: string\n  isActive: boolean",
  "  name: string\n  groupName?: string\n  isActive: boolean"
);

fs.writeFileSync(filePath, content);
console.log("Fixed Repo type properly.");
