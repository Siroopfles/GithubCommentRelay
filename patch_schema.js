const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(filePath, 'utf8');

// Insert groupName into Repository model
content = content.replace("createdAt              DateTime            @default(now())", "groupName              String?             @default(\"Default\")\n  createdAt              DateTime            @default(now())");

fs.writeFileSync(filePath, content);
console.log("Schema updated");
