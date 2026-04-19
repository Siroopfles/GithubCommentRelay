const fs = require('fs');
let code = fs.readFileSync('src/app/api/settings/route.ts', 'utf8');

code = code.replace(
  'hasJulesApiKey: false',
  'hasJulesApiKey: false,\n      pruneDays: 60'
);

code = code.replace(
  'hasJulesApiKey: !!settings.julesApiKey',
  'hasJulesApiKey: !!settings.julesApiKey,\n    pruneDays: settings.pruneDays'
);

code = code.replace(
  'if (typeof data.batchDelay !== \'number\' || !Number.isInteger(data.batchDelay) || data.batchDelay <= 0) {',
  'if (data.pruneDays !== undefined && (typeof data.pruneDays !== \'number\' || !Number.isInteger(data.pruneDays) || data.pruneDays <= 0)) {\n      return NextResponse.json({ error: \'pruneDays must be a positive integer\' }, { status: 400 })\n    }\n\n    if (typeof data.batchDelay !== \'number\' || !Number.isInteger(data.batchDelay) || data.batchDelay <= 0) {'
);

code = code.replace(
  'batchDelay: data.batchDelay,',
  'batchDelay: data.batchDelay,\n      pruneDays: data.pruneDays !== undefined ? data.pruneDays : undefined,'
);

code = code.replace(
  'batchDelay: data.batchDelay,',
  'batchDelay: data.batchDelay,\n        pruneDays: data.pruneDays !== undefined ? data.pruneDays : 60,'
);


fs.writeFileSync('src/app/api/settings/route.ts', code);
console.log('API Patched');
