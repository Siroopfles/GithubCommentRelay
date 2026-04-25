const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'repositories', '[id]', 'route.ts');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    "const data = await request.json()",
    "const data = await request.json();\n    if (data.groupName === '') data.groupName = 'Default';"
  );

  fs.writeFileSync(filePath, content);
  console.log("Repo API PUT route patched.");
} else {
  console.log("Repo API PUT route not found.");
}
