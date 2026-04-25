const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'repositories', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "type Repo = { id: string, owner: string, name: string, isActive: boolean, autoMergeEnabled: boolean",
  "type Repo = { id: string, owner: string, name: string, groupName?: string, isActive: boolean, autoMergeEnabled: boolean"
);

fs.writeFileSync(filePath, content);
console.log("Fixed Repo type.");
