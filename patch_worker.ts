import * as fs from 'fs';

let content = fs.readFileSync('worker.ts', 'utf8');

// Insert new tasks logic
const taskLogic = `
async function syncAndProcessTasks(repoConfig: any, octokit: any, settings: any) {
  try {
    // 1. Sync tasks from local folder if applicable
    if (repoConfig.taskSourceType === 'local_folder' && repoConfig.taskSourcePath) {
      const fs = require('fs');
      const path = require('path');

      if (fs.existsSync(repoConfig.taskSourcePath)) {
        const files = fs.readdirSync(repoConfig.taskSourcePath);
        for (const file of files) {
          if (file.endsWith('.md') || file.endsWith('.json')) {
            const filePath = path.join(repoConfig.taskSourcePath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            let title = file;
            let body = content;
            let priority = 0;
            let contextFiles = null;

            // Simple frontmatter parsing
            if (content.startsWith('---')) {
              const parts = content.split('---');
              if (parts.length >= 3) {
                const fm = parts[1];
                body = parts.slice(2).join('---').trim();
                const titleMatch = fm.match(/title:\s*(.*)/);
                if (titleMatch) title = titleMatch[1].trim();
                const prioMatch = fm.match(/priority:\s*(\\d+)/);
                if (prioMatch) priority = parseInt(prioMatch[1], 10);
                const ctxMatch = fm.match(/contextFiles:\s*\\[(.*)\\]/);
                if (ctxMatch) {
                    try {
                        contextFiles = JSON.stringify(ctxMatch[1].split(',').map((s: string) => s.trim().replace(/['"]/g, '')));
                    } catch (e) {}
                }
              }
            }

            // Extract issue number prefix if present
            const issueMatch = file.match(/^(\\d+)-/);
            const issueNum = issueMatch ? parseInt(issueMatch[1], 10) : null;

            // Check if exists
            const existing = await prisma.task.findFirst({
              where: { repositoryId: repoConfig.id, title }
            });

            if (!existing) {
              await prisma.task.create({
                data: {
                  repositoryId: repoConfig.id,
                  title,
                  body,
                  status: 'backlog',
                  source: 'local_folder',
                  priority,
                  githubIssueNumber: issueNum,
                  contextFiles
                }
              });
              console.log(\`Imported task from file: \${title}\`);
            }
          }
        }
      }
    }

    // 2. Sync from GitHub Issues
    if (repoConfig.taskSourceType === 'github_issues' || repoConfig.taskSourceType === 'local_folder') {
       try {
           const issues = await octokit.rest.issues.listForRepo({
               owner: repoConfig.owner,
               repo: repoConfig.name,
               state: 'open'
           });

           for (const issue of issues.data) {
               if (issue.pull_request) continue; // Skip PRs

               const hasJulesLabel = issue.labels.some((l: any) => l.name === 'jules' || l.name === 'jules-scheduled');

               if (!hasJulesLabel) {
                   const existing = await prisma.task.findFirst({
                       where: { repositoryId: repoConfig.id, githubIssueNumber: issue.number }
                   });

                   if (!existing && repoConfig.taskSourceType === 'github_issues') {
                       await prisma.task.create({
                           data: {
                               repositoryId: repoConfig.id,
                               title: issue.title,
                               body: issue.body || '',
                               status: 'backlog',
                               source: 'github_issue',
                               githubIssueNumber: issue.number,
                           }
                       });
                       console.log(\`Imported task from issue #\${issue.number}\`);
                   }
               }
           }
       } catch (e) {
           console.error(\`Failed to sync issues for \${repoConfig.name}: \`, e);
       }
    }

    // 3. Process Tasks (Kanban flow)
    const activeTasks = await prisma.task.count({
        where: {
            repositoryId: repoConfig.id,
            status: { in: ['in_progress', 'in_review'] }
        }
    });

    const maxConcurrent = repoConfig.maxConcurrentTasks || 3;

    // Auto-promote backlog to todo if todo is empty
    const todoTasksCount = await prisma.task.count({
        where: { repositoryId: repoConfig.id, status: 'todo' }
    });

    if (todoTasksCount === 0) {
        const topBacklog = await prisma.task.findFirst({
            where: { repositoryId: repoConfig.id, status: 'backlog' },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
        });
        if (topBacklog) {
            await prisma.task.update({
                where: { id: topBacklog.id },
                data: { status: 'todo' }
            });
            console.log(\`Promoted task \${topBacklog.title} from backlog to todo\`);
        }
    }

    // Check PR status for 'in_progress' and 'in_review' tasks
    const trackingTasks = await prisma.task.findMany({
        where: { repositoryId: repoConfig.id, status: { in: ['in_progress', 'in_review'] } }
    });

    for (const t of trackingTasks) {
        if (t.prNumber) {
            try {
                const pr = await octokit.rest.pulls.get({
                    owner: repoConfig.owner,
                    repo: repoConfig.name,
                    pull_number: t.prNumber
                });

                if (pr.data.merged) {
                    await prisma.task.update({ where: { id: t.id }, data: { status: 'done' } });
                    console.log(\`Task \${t.title} marked as done (PR merged)\`);
                } else if (pr.data.state === 'closed') {
                    await prisma.task.update({ where: { id: t.id }, data: { status: 'blocked' } });
                    console.log(\`Task \${t.title} blocked (PR closed without merge)\`);
                } else if (t.status === 'in_progress') {
                    await prisma.task.update({ where: { id: t.id }, data: { status: 'in_review' } });
                }
            } catch (e) {
                console.error(\`Failed to check PR status for task \${t.title}\`);
            }
        } else {
            // Find PR by issue number or julesSessionId
            try {
                const pulls = await octokit.rest.pulls.list({
                    owner: repoConfig.owner,
                    repo: repoConfig.name,
                    state: 'open'
                });

                for (const pr of pulls.data) {
                    const bodyMatch = pr.body?.includes(\`Fixes #\${t.githubIssueNumber}\`) ||
                                      (t.julesSessionId && pr.body?.includes(\`task/\${t.julesSessionId}\`));
                    if (bodyMatch) {
                        await prisma.task.update({
                            where: { id: t.id },
                            data: { prNumber: pr.number, status: 'in_review' }
                        });
                        console.log(\`Linked task \${t.title} to PR #\${pr.number}\`);
                        break;
                    }
                }
            } catch (e) {}
        }
    }

    // Start new tasks if we have capacity
    if (activeTasks < maxConcurrent) {
        const nextTask = await prisma.task.findFirst({
            where: { repositoryId: repoConfig.id, status: 'todo' },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
        });

        if (nextTask) {
            console.log(\`Starting task: \${nextTask.title}\`);

            if (nextTask.githubIssueNumber) {
                // Add jules label to trigger external GitHub App
                try {
                    await octokit.rest.issues.addLabels({
                        owner: repoConfig.owner,
                        repo: repoConfig.name,
                        issue_number: nextTask.githubIssueNumber,
                        labels: ['jules']
                    });
                    await prisma.task.update({
                        where: { id: nextTask.id },
                        data: { status: 'in_progress' }
                    });
                } catch (e) {
                    console.error(\`Failed to add label to issue #\${nextTask.githubIssueNumber}\`);
                }
            } else if (settings?.julesApiKey) {
                // Use Jules API natively
                try {
                    let prompt = repoConfig.julesPromptTemplate || "Start with the next task: {{task_title}}. Details: {{task_body}}.";
                    prompt = prompt.replace('{{task_title}}', nextTask.title);
                    prompt = prompt.replace('{{task_body}}', nextTask.body || '');

                    if (nextTask.contextFiles) {
                        prompt += \`\\n\\nPlease review these files for context: \${nextTask.contextFiles}\`;
                    }

                    // Call imported createSession
                    const res = await createSession(settings.julesApiKey, prompt, repoConfig.owner + "/" + repoConfig.name);

                    if (res && res.name) {
                        const sessionIdMatch = res.name.match(/sessions\\/(\\d+)/);
                        const sessionId = sessionIdMatch ? sessionIdMatch[1] : res.name;

                        await prisma.task.update({
                            where: { id: nextTask.id },
                            data: { status: 'in_progress', julesSessionId: sessionId }
                        });
                    }
                } catch (e) {
                    console.error(\`Failed to start task natively via Jules API\`);
                    await prisma.task.update({
                        where: { id: nextTask.id },
                        data: { status: 'blocked' }
                    });
                }
            } else {
                 console.log("Cannot start manual task: no Jules API key and no Github Issue number.");
            }
        }
    }

  } catch (e) {
    console.error(\`Error in syncAndProcessTasks for \${repoConfig.name}: \`, e);
  }
}
`;

content = content.replace("async function processRepositories() {", taskLogic + "\nasync function processRepositories() {");

const callLogicRegex = /if \(!octokit\) continue\n/;
content = content.replace(callLogicRegex, `if (!octokit) continue\n      \n      // Sync and process Tasks first\n      await syncAndProcessTasks(repoConfig, octokit, settings)\n\n`);

fs.writeFileSync('worker.ts', content);
