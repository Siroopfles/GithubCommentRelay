const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'settings', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add AuditLog type and state
const auditState = `
  type AuditLog = { id: string; action: string; entity: string | null; details: string | null; createdAt: string };
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'audit'>('general');

  useEffect(() => {
    if (activeTab === 'audit') {
      fetch('/api/system/audit').then(res => res.json()).then(data => {
        if (Array.isArray(data)) setAuditLogs(data);
      });
    }
  }, [activeTab]);
`;

content = content.replace("  const [importMessage, setImportMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);", "  const [importMessage, setImportMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);\n" + auditState);


// Add Tabs at the top
const tabsHtml = `
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={\`pb-2 px-1 text-sm font-medium border-b-2 transition-colors \${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}\`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={\`pb-2 px-1 text-sm font-medium border-b-2 transition-colors \${activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}\`}
        >
          Audit Logs
        </button>
      </div>

      {activeTab === 'general' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
`;

// Insert the tabs opening logic
content = content.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-8">/,
  tabsHtml
);

// Add the Audit Log View at the end of the file, before the closing div and System Update Modal
const auditViewHtml = `
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Shield className="text-blue-500" /> System Audit Logs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-medium">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.entity || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs max-w-md truncate">{log.details || '-'}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No audit logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
`;

content = content.replace(
  /      <\/div>\s*\{\/\* System Update Modal \*\/\}/,
  auditViewHtml + "\n      {/* System Update Modal */}"
);

fs.writeFileSync(filePath, content);
console.log("Settings UI patched for Audit Logs");
