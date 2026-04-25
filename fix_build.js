const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'system', 'import', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("tx.prLabelRule.deleteMany", "tx.pRLabelRule.deleteMany");

fs.writeFileSync(filePath, content);
console.log("Fixed typo in Prisma transaction call.");
