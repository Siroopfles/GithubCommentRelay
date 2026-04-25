const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'repositories', '[id]', 'page.tsx');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Import
  content = content.replace(
    "import { useParams, useRouter } from 'next/navigation'",
    "import { useParams, useRouter } from 'next/navigation'\nimport TemplateBuilder from '@/components/TemplateBuilder'"
  );

  // Define variables for builder
  const varsCode = `
  const commentVars = [
    { name: 'bot_name', description: 'Name of the tool (e.g. ESLint)' },
    { name: 'file_path', description: 'Path to the affected file' },
    { name: 'error_code', description: 'Specific error code or rule' },
    { name: 'message', description: 'The actual issue message' },
    { name: 'author', description: 'PR Author' }
  ];

  const julesVars = [
    { name: 'pr_title', description: 'Title of the PR' },
    { name: 'aggregated_comments', description: 'List of all bot comments' },
    { name: 'repo_name', description: 'Name of the repository' }
  ];
`;
  content = content.replace("const [isLoading, setIsLoading] = useState(true)", varsCode + "\n  const [isLoading, setIsLoading] = useState(true)");


  // Replace textareas (assuming they exist, if not we fall back)
  content = content.replace(
    /<textarea \{\.\.\.register\('commentTemplate'\)\} rows=\{4\} className="[^"]+" placeholder="[^"]+"><\/textarea>/g,
    "<TemplateBuilder value={repo?.commentTemplate || ''} onChange={(val) => setValue('commentTemplate', val, { shouldDirty: true })} variables={commentVars} />"
  );

  content = content.replace(
    /<textarea \{\.\.\.register\('julesPromptTemplate'\)\} rows=\{4\} className="[^"]+" placeholder="[^"]+"><\/textarea>/g,
    "<TemplateBuilder value={repo?.julesPromptTemplate || ''} onChange={(val) => setValue('julesPromptTemplate', val, { shouldDirty: true })} variables={julesVars} />"
  );


  fs.writeFileSync(filePath, content);
  console.log("Patched specific repo page.");
} else {
  console.log("Specific repo page not found, skipping.");
}
