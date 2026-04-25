const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(filePath, 'utf8');

// Append AuditLog model to schema
const auditModel = `
model AuditLog {
  id        String   @id @default(cuid())
  action    String   // e.g., "UPDATE_SETTINGS", "IMPORT_CONFIG"
  entity    String?  // e.g., "Settings", "Repository"
  details   String?  // JSON stringified details
  createdAt DateTime @default(now())

  @@index([createdAt])
}
`;

content += auditModel;

fs.writeFileSync(filePath, content);
console.log("Schema updated with AuditLog");
