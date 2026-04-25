const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'logs', 'chat', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// I accidentally removed the ruleType state completely earlier instead of just narrowing it.
const restoreState = `
  const [showModal, setShowModal] = useState(false)
  const ruleType = "reviewer";
`;
content = content.replace("  const [showModal, setShowModal] = useState(false)", restoreState.trim());

fs.writeFileSync(filePath, content);
console.log("Restored ruleType constant.");
