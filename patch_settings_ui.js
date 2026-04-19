const fs = require('fs');
let code = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

code = code.replace(
  'julesApiKey?: string',
  'julesApiKey?: string\n  pruneDays: string'
);

code = code.replace(
  'batchDelay: data.batchDelay?.toString() || \'5\',',
  'batchDelay: data.batchDelay?.toString() || \'5\',\n            pruneDays: data.pruneDays?.toString() || \'60\','
);

code = code.replace(
  'const batchDelay = Number(data.batchDelay)',
  'const batchDelay = Number(data.batchDelay)\n    const pruneDays = Number(data.pruneDays)'
);

code = code.replace(
  'if (!Number.isFinite(batchDelay) || batchDelay <= 0) {',
  'if (!Number.isFinite(pruneDays) || pruneDays <= 0) {\n      setMessage({ type: \'error\', text: \'Prune Days must be a valid positive number.\' })\n      return\n    }\n\n    if (!Number.isFinite(batchDelay) || batchDelay <= 0) {'
);

code = code.replace(
  'batchDelay',
  'batchDelay,\n          pruneDays'
);

code = code.replace(
  'batchDelay: responseData.batchDelay.toString(),',
  'batchDelay: responseData.batchDelay.toString(),\n        pruneDays: responseData.pruneDays.toString(),'
);

const uiInput = `
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-Prune Days</label>
          <input
            type="number"
            {...register('pruneDays')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Number of days to keep processed comments in the database before deleting them to save space.</p>
        </div>
`;

code = code.replace(
  '<div>\n          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jules API Key</label>',
  uiInput + '\n        <div>\n          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jules API Key</label>'
);

fs.writeFileSync('src/app/settings/page.tsx', code);
console.log('UI Patched');
