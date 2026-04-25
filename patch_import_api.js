const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'system', 'import', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Insert audit log creation before return
content = content.replace(
  "    return NextResponse.json({ success: true, results });",
  "    await prisma.auditLog.create({ data: { action: 'IMPORT_CONFIG', entity: 'System', details: JSON.stringify(results) } });\n    return NextResponse.json({ success: true, results });"
);

fs.writeFileSync(filePath, content);
console.log("Import API updated to log audits.");
