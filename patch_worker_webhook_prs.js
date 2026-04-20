const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

code = code.replace(
  "const prsData = webhookPrs && webhookPrs.length > 0 ? { data: webhookPrs.filter(w => w.owner === repo.owner && w.name === repo.name).map(w => ({ number: w.prNumber, user: { login: settings.githubToken ? '' : '' }, head: { ref: '' }, base: { ref: '' } })) } : await octokit.rest.pulls.list({",
  `let prsData;
        if (webhookPrs && webhookPrs.length > 0) {
            const relevantWebhooks = webhookPrs.filter(w => w.owner === repo.owner && w.name === repo.name);
            if (relevantWebhooks.length === 0) {
                 continue; // skip repo entirely if this was a targeted webhook trigger
            }
            prsData = { data: relevantWebhooks.map(w => ({ number: w.prNumber, user: { login: currentUser.login }, head: { ref: '' }, base: { ref: '' } })) };
        } else {
             prsData = await octokit.rest.pulls.list({`
);

// We need to add the closing brace for the else branch
code = code.replace(
  "state: 'open',\n          per_page: 50\n        })",
  "state: 'open',\n          per_page: 50\n        });\n        }"
);

fs.writeFileSync('worker.ts', code);
