import * as fs from 'fs';

let content = fs.readFileSync('src/app/api/repositories/route.ts', 'utf8');

content = content.replace(
  'const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate, postAggregatedComments, batchDelay, branchWhitelist, branchBlacklist, githubToken, requiredBots } = await request.json()',
  'const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, maxConcurrentTasks, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate, postAggregatedComments, batchDelay, branchWhitelist, branchBlacklist, githubToken, requiredBots } = await request.json()'
);

const repoDataRegex = /data: \{\s*owner,\s*name,\s*autoMergeEnabled: autoMergeEnabled \|\| false,\s*requiredApprovals: parsedApprovals,\s*requireCI: requireCI !== undefined \? requireCI : true,\s*mergeStrategy: \['merge', 'squash', 'rebase'\].includes\(mergeStrategy\) \? mergeStrategy : 'merge',\s*taskSourceType: validTaskSourceType,\s*taskSourcePath: taskSourcePath \|\| null,/m;

const replacement = `data: {
        owner,
        name,
        autoMergeEnabled: autoMergeEnabled || false,
        requiredApprovals: parsedApprovals,
        requireCI: requireCI !== undefined ? requireCI : true,
        mergeStrategy: ['merge', 'squash', 'rebase'].includes(mergeStrategy) ? mergeStrategy : 'merge',
        taskSourceType: validTaskSourceType,
        taskSourcePath: taskSourcePath || null,
        maxConcurrentTasks: typeof maxConcurrentTasks === 'number' ? maxConcurrentTasks : 3,`;

content = content.replace(repoDataRegex, replacement);

fs.writeFileSync('src/app/api/repositories/route.ts', content);
