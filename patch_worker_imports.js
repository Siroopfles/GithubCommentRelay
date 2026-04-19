const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

code = code.replace(
  'import cron from \'node-cron\'',
  'import cron from \'node-cron\'\nimport { logger } from \'./src/lib/logger\''
);

code = code.replace(/console\.log/g, 'logger.info');
code = code.replace(/console\.error/g, 'logger.error');
code = code.replace(/console\.warn/g, 'logger.warn');

fs.writeFileSync('worker.ts', code);
console.log('Worker Imports Patched');
