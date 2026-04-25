const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'settings', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Insert icon imports
content = content.replace("import { Save, RefreshCw, Eye, EyeOff, Bot, Plus, Trash2, Github, Key, Clock, Shield } from 'lucide-react'", "import { Save, RefreshCw, Eye, EyeOff, Bot, Plus, Trash2, Github, Key, Clock, Shield, Download, Upload } from 'lucide-react'");

// Add state for Import
const stateCode = `
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    forceOverwrite: false,
    importSettings: true,
    importRepos: true,
    importReviewers: true,
    importBots: true,
  });
  const [importMessage, setImportMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
`;

content = content.replace("const [hasWebhookSecret, setHasWebhookSecret] = useState(false)", "const [hasWebhookSecret, setHasWebhookSecret] = useState(false)\n" + stateCode);

// Add Import/Export functions
const functionsCode = `
  const handleExport = async () => {
    try {
      const res = await fetch('/api/system/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`github-bot-config-\${new Date().toISOString().split('T')[0]}.json\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export configuration');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const payload = JSON.parse(text);

      if (!payload.version || !payload.data) {
        setImportMessage({ type: 'error', text: 'Invalid import file format.' });
        return;
      }

      const res = await fetch('/api/system/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, options: importOptions })
      });

      const result = await res.json();
      if (result.success) {
        setImportMessage({ type: 'success', text: 'Import successful! Reloading page...' });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setImportMessage({ type: 'error', text: result.error || 'Import failed' });
      }
    } catch (e) {
      setImportMessage({ type: 'error', text: 'Failed to read or parse file.' });
    }
  };
`;

content = content.replace("const onSubmit = async (data: SettingsForm) => {", functionsCode + "\n  const onSubmit = async (data: SettingsForm) => {");

// Add UI Component
const uiCode = `
        {/* Import / Export Card */}
        <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:col-span-2 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Download className="text-blue-500" />
            <h2 className="text-xl font-bold">Data Management (Import / Export)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Export */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Export Configuration</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Download all your settings, repositories, reviewers, and bot mappings in a single JSON file. Sensitive tokens (API keys) are excluded for security.
              </p>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                <Download size={18} /> Export as JSON
              </button>
            </div>

            {/* Import */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Import Configuration</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload a previously exported JSON file to restore or duplicate settings.
              </p>

              <div className="space-y-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-100"
                />
              </div>

              {importFile && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
                  <p className="text-sm font-medium mb-2">Import Options:</p>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={importOptions.importSettings} onChange={(e) => setImportOptions({...importOptions, importSettings: e.target.checked})} className="rounded text-blue-600" /> Settings
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={importOptions.importRepos} onChange={(e) => setImportOptions({...importOptions, importRepos: e.target.checked})} className="rounded text-blue-600" /> Repositories
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={importOptions.importReviewers} onChange={(e) => setImportOptions({...importOptions, importReviewers: e.target.checked})} className="rounded text-blue-600" /> Target Reviewers
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={importOptions.importBots} onChange={(e) => setImportOptions({...importOptions, importBots: e.target.checked})} className="rounded text-blue-600" /> Bot Mappings
                  </label>
                  <hr className="my-2 border-gray-200 dark:border-gray-700" />
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-orange-600 dark:text-orange-400 font-medium">
                    <input type="checkbox" checked={importOptions.forceOverwrite} onChange={(e) => setImportOptions({...importOptions, forceOverwrite: e.target.checked})} className="rounded text-orange-600" /> Force Overwrite Existing
                  </label>

                  <button
                    onClick={handleImport}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    <Upload size={18} /> Run Import
                  </button>

                  {importMessage && (
                    <div className={\`p-3 rounded-lg text-sm \${importMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}\`}>
                      {importMessage.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
`;

// Insert the UI component before the closing div of the main grid
content = content.replace("</div>\n\n      {/* System Update Modal */}", uiCode + "\n      </div>\n\n      {/* System Update Modal */}");

fs.writeFileSync(filePath, content);
console.log("Settings page updated");
