const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'repositories', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { Trash2, Edit2, X, Save, Eye } from 'lucide-react'",
  "import { Trash2, Edit2, X, Save, Eye, Settings } from 'lucide-react'"
);

fs.writeFileSync(filePath, content);
console.log("Fixed missing imports again.");
