const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'repositories', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update Repo type
content = content.replace(
  "type Repo = { id: string, owner: string, name: string, isActive: boolean, autoMergeEnabled: boolean, requiredApprovals: number, requireCI: boolean, mergeStrategy: string, taskSourceType: string, taskSourcePath: string | null, maxConcurrentTasks: number, julesPromptTemplate: string | null, julesChatForwardMode: string, julesChatForwardDelay: number, aiSystemPrompt: string | null, commentTemplate: string | null, postAggregatedComments: boolean, batchDelay: number | null, branchWhitelist: string | null, branchBlacklist: string | null, requiredBots: string | null, hasGithubToken: boolean }",
  "type Repo = { id: string, owner: string, name: string, groupName: string, isActive: boolean, autoMergeEnabled: boolean, requiredApprovals: number, requireCI: boolean, mergeStrategy: string, taskSourceType: string, taskSourcePath: string | null, maxConcurrentTasks: number, julesPromptTemplate: string | null, julesChatForwardMode: string, julesChatForwardDelay: number, aiSystemPrompt: string | null, commentTemplate: string | null, postAggregatedComments: boolean, batchDelay: number | null, branchWhitelist: string | null, branchBlacklist: string | null, requiredBots: string | null, hasGithubToken: boolean }"
);

// Add groupName to useForm definitions
content = content.replace(
  "name: string\n    autoMergeEnabled",
  "name: string\n    groupName?: string\n    autoMergeEnabled"
);
content = content.replace(
  "name: string\n    autoMergeEnabled",
  "name: string\n    groupName?: string\n    autoMergeEnabled"
);

// Add state for accordion groups
content = content.replace(
  "const [editingId, setEditingId] = useState<string | null>(null)",
  "const [editingId, setEditingId] = useState<string | null>(null)\n  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})"
);

// Helper function to render grouped repos
const groupedCode = `
  // Group repositories by groupName
  const groupedRepos = repos.reduce((acc, repo) => {
    const group = repo.groupName || 'Default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(repo);
    return acc;
  }, {} as Record<string, Repo[]>);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: prev[group] === undefined ? false : !prev[group] }));
  };
`;

content = content.replace("const onSubmit = async (data: any) => {", groupedCode + "\n  const onSubmit = async (data: any) => {");

// Replace the table with a grouped rendering
const oldTableStart = "<table className=\"min-w-full divide-y divide-gray-200 dark:divide-gray-700\">";
const oldTableEnd = "</table>";

// Create a regex to match the entire table
const tableRegex = /<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">[\s\S]*?<\/table>/;

const newTableCode = `
        <div className="space-y-4">
          {Object.entries(groupedRepos).map(([groupName, groupRepos]) => {
            const isExpanded = expandedGroups[groupName] !== false;
            return (
              <div key={groupName} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{groupName}</span>
                    <span className="bg-gray-200 dark:bg-gray-700 text-xs py-0.5 px-2 rounded-full">{groupRepos.length}</span>
                  </div>
                  <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {isExpanded && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-white dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repository</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto-Merge</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jules Chat</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {groupRepos.map(repo => (
                        <tr key={repo.id}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">
                            {repo.owner}/{repo.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleActive(repo.id, repo.isActive)}
                              className={\`px-2 py-1 rounded text-xs font-medium \${repo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}\`}
                            >
                              {repo.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {repo.autoMergeEnabled ? 'Enabled' : 'Disabled'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {repo.taskSourceType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {repo.julesChatForwardMode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                            <button onClick={() => startEdit(repo)} className="text-blue-600 hover:text-blue-900"><Edit2 size={18}/></button>
                            <button onClick={() => deleteRepo(repo.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                            <Link href={\`/repositories/\${repo.id}\`} className="text-gray-600 hover:text-gray-900"><Settings size={18}/></Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {repos.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl">
              No repositories added yet.
            </div>
          )}
        </div>
`;

content = content.replace(tableRegex, newTableCode);

// Add groupName field to create form
const groupFieldCreate = `
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group / Folder</label>
                <input {...register('groupName')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" placeholder="e.g. Work, Open Source" />
              </div>
`;

// Insert groupName after name field in create form
content = content.replace(
  /<input \{\.\.\.register\('name', \{ required: true \}\)\} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2\.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" \/>\s*<\/div>/,
  "<input {...register('name', { required: true })} className=\"w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100\" />\n              </div>" + groupFieldCreate
);

// Add groupName field to edit form
const groupFieldEdit = `
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group / Folder</label>
                <input {...registerEdit('groupName')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" placeholder="e.g. Work, Open Source" />
              </div>
`;

// Insert groupName after name field in edit form
content = content.replace(
  /<input \{\.\.\.registerEdit\('name', \{ required: true \}\)\} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2\.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" \/>\s*<\/div>/,
  "<input {...registerEdit('name', { required: true })} className=\"w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100\" />\n              </div>" + groupFieldEdit
);


fs.writeFileSync(filePath, content);
console.log("Repositories page UI patched for grouping.");
