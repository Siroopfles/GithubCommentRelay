const fs = require('fs');
let code = fs.readFileSync('src/app/api/settings/route.ts', 'utf8');

code = code.replace(
  'hasJulesApiKey: !!settings.julesApiKey,\n    pruneDays: settings.pruneDays',
  'hasJulesApiKey: !!settings.julesApiKey,\n    pruneDays: settings.pruneDays,\n    githubRateLimitRemaining: settings.githubRateLimitRemaining,\n    githubRateLimitReset: settings.githubRateLimitReset'
);

fs.writeFileSync('src/app/api/settings/route.ts', code);
console.log('API Patched');
