const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'repositories', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, maxConcurrentTasks, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate, postAggregatedComments, batchDelay, branchWhitelist, branchBlacklist, githubToken, requiredBots } = await request.json()",
  "const { owner, name, groupName, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, maxConcurrentTasks, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate, postAggregatedComments, batchDelay, branchWhitelist, branchBlacklist, githubToken, requiredBots } = await request.json()"
);

content = content.replace(
  "owner,\n        name,",
  "owner,\n        name,\n        groupName: groupName || 'Default',"
);

fs.writeFileSync(filePath, content);
console.log("Repo API POST route patched.");
