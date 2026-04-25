const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'settings', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Insert audit log creation after upsert
content = content.replace(
  "    const settings = await prisma.settings.upsert({",
  "    await prisma.auditLog.create({ data: { action: 'UPDATE_SETTINGS', entity: 'Settings', details: JSON.stringify(updateData) } });\n    const settings = await prisma.settings.upsert({"
);

fs.writeFileSync(filePath, content);
console.log("Settings API updated to log audits.");
