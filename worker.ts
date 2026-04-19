import { PrismaClient } from '@prisma/client'
import { processFailsafeForwarding } from "./patch_failsafe";
import { formatAggregatedBody } from "./src/lib/format_helper";
import { createSession, sendMessage } from "./src/lib/julesApi";
import { prisma } from './src/lib/prisma'
import { Octokit } from 'octokit'
// @ts-ignore
import cron from 'node-cron'
import { logger } from './src/lib/logger'


let isRunning = false;


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
            let contextFiles: string | null = null;

            // Simple frontmatter parsing
            if (content.startsWith('---')) {
              const parts = content.split('---');
              if (parts.length >= 3) {
                const fm = parts[1];
                body = parts.slice(2).join('---').trim();
                const titleMatch = fm.match(/title:\s*(.*)/);
                if (titleMatch) title = titleMatch[1].trim();
                const prioMatch = fm.match(/priority:\s*(\d+)/);
                if (prioMatch) priority = parseInt(prioMatch[1], 10);
                const ctxMatch = fm.match(/contextFiles:\s*\[(.*)\]/);
                if (ctxMatch) {
                    try {
                        contextFiles = JSON.stringify(ctxMatch[1].split(',').map((s: string) => s.trim().replace(/['"]/g, '')));
                    } catch (e) {}
                }
              }
            }

            // Extract issue number prefix if present
            const issueMatch = file.match(/^(\d+)-/);
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
              logger.info(`Imported task from file: ${title}`);
            }
          }
        }
      }
    }

    // 2. Sync from GitHub Issues
    if (repoConfig.taskSourceType === 'github_issues') {
       try {
           const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
               owner: repoConfig.owner,
               repo: repoConfig.name,
               state: 'open',
               per_page: 100
           });

           for (const issue of issues) {
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
                       logger.info(`Imported task from issue #${issue.number}`);
                   }
               }
           }
       } catch (e) {
           logger.error(`Failed to sync issues for ${repoConfig.name}: `, e);
       }
    }

    // 3. Process Tasks (Kanban flow)
    const maxConcurrent = repoConfig.maxConcurrentTasks ?? 3;

    // Auto-promote backlog to todo if todo is empty
    const todoTasksCount = await prisma.task.count({
        where: { repositoryId: repoConfig.id, status: 'todo' }
    });

    if (todoTasksCount === 0 && maxConcurrent > 0) {
        const topBacklog = await prisma.task.findFirst({
            where: { repositoryId: repoConfig.id, status: 'backlog' },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
        });
        if (topBacklog) {
            await prisma.task.update({
                where: { id: topBacklog.id },
                data: { status: 'todo' }
            });
            logger.info(`Promoted task ${topBacklog.title} from backlog to todo`);
        }
    }

    // Check PR status for 'in_progress' and 'in_review' tasks
    const trackingTasks = await prisma.task.findMany({
        where: { repositoryId: repoConfig.id, status: { in: ['in_progress', 'in_review'] } }
    });

    let cachedPulls: any[] | null = null;

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
                    logger.info(`Task ${t.title} marked as done (PR merged)`);
                } else if (pr.data.state === 'closed') {
                    await prisma.task.update({ where: { id: t.id }, data: { status: 'blocked' } });
                    logger.info(`Task ${t.title} blocked (PR closed without merge)`);
                } else if (t.status === 'in_progress') {
                    await prisma.task.update({ where: { id: t.id }, data: { status: 'in_review' } });
                }
            } catch (e) {
                logger.error(`Failed to check PR status for task ${t.title}`);
            }
        } else {
            // Find PR by issue number or julesSessionId
            try {
                if (!cachedPulls) {
                    const pulls = await octokit.paginate(octokit.rest.pulls.list, {
                        owner: repoConfig.owner,
                        repo: repoConfig.name,
                        state: 'open'
                    });
                    cachedPulls = pulls;
                }

                for (const pr of cachedPulls!) {
                    const bodyMatch = (t.githubIssueNumber !== null && pr.body?.includes(`Fixes #${t.githubIssueNumber}`)) ||
                                      (t.julesSessionId && pr.body?.includes(`task/${t.julesSessionId}`));
                    if (bodyMatch) {
                        await prisma.task.update({
                            where: { id: t.id },
                            data: { prNumber: pr.number, status: 'in_review' }
                        });
                        logger.info(`Linked task ${t.title} to PR #${pr.number}`);
                        break;
                    }
                }
            } catch (e) {}
        }
    }

    // Start new tasks if we have capacity
    const currentActiveTasks = await prisma.task.count({
        where: { repositoryId: repoConfig.id, status: { in: ['in_progress', 'in_review'] } }
    });
    if (currentActiveTasks < maxConcurrent) {
        const nextTask = await prisma.task.findFirst({
            where: { repositoryId: repoConfig.id, status: 'todo' },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
        });

        if (nextTask) {
            logger.info(`Starting task: ${nextTask.title}`);

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
                    logger.error(`Failed to add label to issue #${nextTask.githubIssueNumber}`);
                }
            } else if (settings?.julesApiKey) {
                // Use Jules API natively
                try {
                    let prompt = (repoConfig.julesPromptTemplate || "Start with the next task: {{task_title}}. Details: {{task_body}}.")
                      .replace(/\{\{task_title\}\}/g, nextTask.title)
                      .replace(/\{\{task_body\}\}/g, nextTask.body || '');

                    if (nextTask.contextFiles) {
                        prompt += `\n\nPlease review these files for context: ${nextTask.contextFiles}`;
                    }

                    // Call imported createSession
                    const res = await createSession(settings.julesApiKey, prompt, `github.com/${repoConfig.owner}/${repoConfig.name}`, 'refs/heads/main');

                    if (res && res.name) {
                        const sessionIdMatch = res.name.match(/sessions\/(\d+)/);
                        const sessionId = sessionIdMatch ? sessionIdMatch[1] : res.name;

                        await prisma.task.update({
                            where: { id: nextTask.id },
                            data: { status: 'in_progress', julesSessionId: sessionId }
                        });
                    }
                } catch (e) {
                    logger.error(`Failed to start task natively via Jules API`);
                    await prisma.task.update({
                        where: { id: nextTask.id },
                        data: { status: 'blocked' }
                    });
                }
            } else {
                 logger.info("Cannot start manual task: no Jules API key and no Github Issue number.");
            }
        }
    }

  } catch (e) {
    logger.error(`Error in syncAndProcessTasks for ${repoConfig.name}: `, e);
  }
}



let lastSavedRemaining = 5000;
let lastSavedAt = 0;

function createOctokit(token: string) {
  return new Octokit({
    auth: token,
    request: {
      hook: async (request: any, options: any) => {
        try {
          const res = await request(options);
          const limitStr = res.headers['x-ratelimit-remaining'];
          const resetStr = res.headers['x-ratelimit-reset'];

          if (limitStr && resetStr) {
            const limit = parseInt(limitStr, 10);
            const reset = new Date(parseInt(resetStr, 10) * 1000);

            const now = Date.now();
            if (Math.abs(lastSavedRemaining - limit) >= 10 || limit < 200 || (now - lastSavedAt) > 60000) {
                try {
                  await prisma.settings.update({
                    where: { id: 1 },
                    data: {
                      githubRateLimitRemaining: limit,
                      githubRateLimitReset: reset
                    }
                  });
                  lastSavedRemaining = limit;
                  lastSavedAt = now;
                } catch (dbErr) {
                  logger.error('Failed to update rate limit in DB:', dbErr);
                }
            }

            if (limit < 50) {
                logger.warn(`GitHub API rate limit is critically low: ${limit} remaining. Resets at ${reset.toISOString()}`);
            }
          }
          return res;
        } catch (error: any) {
            if (error.response && error.response.headers) {
                const limitStr = error.response.headers['x-ratelimit-remaining'];
                const resetStr = error.response.headers['x-ratelimit-reset'];
                if (limitStr && resetStr) {
                    const limit = parseInt(limitStr, 10);
                    const reset = new Date(parseInt(resetStr, 10) * 1000);

                    try {
                        await prisma.settings.update({
                        where: { id: 1 },
                        data: {
                            githubRateLimitRemaining: limit,
                            githubRateLimitReset: reset
                        }
                        });
                        lastSavedRemaining = limit;
                        lastSavedAt = Date.now();
                    } catch (dbErr) {
                       logger.error('Failed to update rate limit in DB error branch:', dbErr);
                    }
                }
            }
            throw error;
        }
      }
    }
  });
}

async function processRepositories(webhookPrs?: {owner: string, name: string, prNumber: number}[]) {
  if (isRunning) {
    logger.info(`[${new Date().toISOString()}] Previous cycle still running, skipping...`);
    return;
  }
  isRunning = true;

  logger.info(`[${new Date().toISOString()}] Starting polling cycle...`)

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } })
    const repos = await prisma.repository.findMany({ where: { isActive: true } });
    const hasAnyToken = settings?.githubToken || repos.some(r => !!r.githubToken);
    if (!hasAnyToken) {
      logger.info('Skipping cycle: No GitHub Token configured anywhere.')
      isRunning = false;
      return
    }

    const rawReviewers = await prisma.targetReviewer.findMany({ where: { isActive: true } });
      const reviewers = rawReviewers.map(r => {
        let compiledRegex: RegExp | null = null;
        if (r.noActionRegex) {
          try {
            compiledRegex = new RegExp(r.noActionRegex, 'i');
          } catch (e) {
            logger.error(`CRITICAL: Failed to compile noActionRegex for ${r.username}: ${r.noActionRegex}`);
          }
        }
        return { ...r, compiledRegex };
      });

    if (repos.length === 0) {
      logger.info('Skipping cycle: No active repositories configured.')
      isRunning = false;
      return
    }



    for (const repo of repos) {
      const tokenToUse = repo.githubToken || settings?.githubToken;
      if (!tokenToUse) {
        logger.info(`Skipping ${repo.owner}/${repo.name}: No GitHub token available (local or global).`);
        continue;
      }
      const octokit = createOctokit(tokenToUse);
      let currentUser;
      try {
        const { data } = await octokit.rest.users.getAuthenticated();
        currentUser = data;
      } catch (e) {
        logger.info(`Skipping ${repo.owner}/${repo.name}: Failed to authenticate with provided token.`);
        continue;
      }

      logger.info(`Checking ${repo.owner}/${repo.name}...`)

      const { data: prs } = await octokit.rest.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: 20
      })

      for (const pr of prs) {
        // Evaluate Branch Whitelist/Blacklist
        const targetBranch = pr.base?.ref;
        if (targetBranch) {
          if (repo.branchWhitelist) {
            const allowed = repo.branchWhitelist.split(',').map(b => b.trim()).filter(b => b.length > 0);
            if (allowed.length > 0 && !allowed.includes(targetBranch)) {
              continue; // Skip PR
            }
          }
          if (repo.branchBlacklist) {
            const blocked = repo.branchBlacklist.split(',').map(b => b.trim()).filter(b => b.length > 0);
            if (blocked.length > 0 && blocked.includes(targetBranch)) {
              continue; // Skip PR
            }
          }
        }
        // Only process PRs created by the user running the bot
        if (pr.user?.login !== currentUser.login) continue;

        // Auto Merge Logic
        if (repo.autoMergeEnabled) {
          try {
            const { data: prDetails } = await octokit.rest.pulls.get({
              owner: repo.owner,
              repo: repo.name,
              pull_number: pr.number
            })

            if (prDetails.mergeable === true) {
              let canMerge = true;

              if (repo.requireCI) {
                // Determine the ref (branch commit) to check
                const ref = prDetails.head.sha;

                // Try to check combined status (classic)
                const { data: combinedStatus } = await octokit.rest.repos.getCombinedStatusForRef({
                  owner: repo.owner,
                  repo: repo.name,
                  ref
                });

                // Try to check Github Actions (checks)
                const { data: checkRuns } = await octokit.rest.checks.listForRef({
                  owner: repo.owner,
                  repo: repo.name,
                  ref,
                  per_page: 100
                });

                // If there are more checks than we fetched (we fetch 100), play it safe and refuse merge
                if (checkRuns.total_count > checkRuns.check_runs.length) {
                  canMerge = false;
                }
                const allChecksSuccessful = checkRuns.check_runs.every(
                  (run: any) => run.status === 'completed' && (run.conclusion === 'success' || run.conclusion === 'skipped' || run.conclusion === 'neutral')
                );

                const classicStatusSuccess = combinedStatus.state === 'success';

                // Check either classic status or action checks to pass
                // If there are no checks or statuses, we assume not ready if requireCI is true
                if (checkRuns.total_count > 0 && !allChecksSuccessful) {
                  canMerge = false;
                }

                if (combinedStatus.total_count > 0 && !classicStatusSuccess) {
                  canMerge = false;
                }

                // If requireCI is true but absolutely no CI pipelines exist, we should not merge.
                if (checkRuns.total_count === 0 && combinedStatus.total_count === 0) {
                  canMerge = false;
                }

                // If totally empty, you might want to wait, or maybe they just have no CI.
                // Assuming canMerge = false if absolutely no checks exist might break repos with no CI.
                // We'll leave it simple for now: if there ARE checks, they must pass.
              }

              if (canMerge) {
                const prReviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
                  owner: repo.owner,
                  repo: repo.name,
                  pull_number: pr.number,
                  per_page: 100
                });

                // Group by reviewer and get the latest state
                const reviewerStates = new Map<string, string>();
                for (const review of prReviews) {
                  if (review.user && review.state !== 'COMMENTED' && review.state !== 'PENDING') {
                    if (review.state === 'DISMISSED') {
                      reviewerStates.delete(review.user.login);
                    } else {
                      reviewerStates.set(review.user.login, review.state);
                    }
                  }
                }

                let approvalCount = 0;
                let hasChangesRequested = false;

                reviewerStates.forEach(state => {
                  if (state === 'APPROVED') approvalCount++;
                  if (state === 'CHANGES_REQUESTED') hasChangesRequested = true;
                });

                if (hasChangesRequested || approvalCount < repo.requiredApprovals) {
                  canMerge = false;
                }
              }

              if (canMerge) {
                logger.info(`Auto-merging PR #${pr.number} for ${repo.owner}/${repo.name}...`);
                await octokit.rest.pulls.merge({
                  owner: repo.owner,
                  repo: repo.name,
                  pull_number: pr.number,
                  merge_method: repo.mergeStrategy as 'merge' | 'squash' | 'rebase'
                });

                try {
                  await prisma.autoMergeLog.create({
                    data: {
                      repoOwner: repo.owner,
                      repoName: repo.name,
                      prNumber: pr.number,
                      status: 'SUCCESS',
                      message: `Merged using ${repo.mergeStrategy} strategy`
                    }
                  });
                } catch (logError) {
                  logger.error('Failed to log auto-merge success:', logError);
                }

                // Jules Task Scheduling
                if (settings?.julesApiKey && repo.taskSourceType !== 'none') {
                  try {
                    let taskTitle = '';
                    let taskBody = '';
                    let sourceRevision = '';

                    if (repo.taskSourceType === 'github_issues') {
                      const { data: issues } = await octokit.rest.issues.listForRepo({
                        owner: repo.owner,
                        repo: repo.name,
                        state: 'open',
                        sort: 'created',
                        direction: 'asc',
                        per_page: 20
                      });

                      // Filter out PRs (GitHub API returns PRs as issues)
                      const actualIssues = issues.filter((issue: any) => !issue.pull_request);

                      let actualIssue: any = null;
                      for (const issue of actualIssues) {
                        actualIssue = issue;
                        // Deduplication: check if issue is already scheduled via label
                        const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({
                          owner: repo.owner,
                          repo: repo.name,
                          issue_number: actualIssue.number
                        });

                        const isScheduled = labels.some((l: any) => l.name === 'jules-scheduled');
                        if (!isScheduled) {
                          taskTitle = actualIssue.title;
                          taskBody = actualIssue.body || '';
                          sourceRevision = `refs/heads/${actualIssue.number}-fix`;

                          // Mark as scheduled immediately
                          let labelSuccess = false;
                          try {
                            await octokit.rest.issues.addLabels({
                              owner: repo.owner,
                              repo: repo.name,
                              issue_number: actualIssue.number,
                              labels: ['jules-scheduled']
                            });
                            labelSuccess = true;
                          } catch (labelErr) {
                            logger.warn(`Failed to label issue ${actualIssue.number} as scheduled. Skipping to prevent duplicates.`, labelErr);
                          }

                          if (!labelSuccess) {
                            // Reset so we don't proceed with this issue
                            taskTitle = '';
                            taskBody = '';
                            sourceRevision = '';
                            continue;
                          }

                          break; // Found one unscheduled issue and labeled it successfully
                        }
                      }
                    } else if (repo.taskSourceType === 'local_folder') {
                       taskTitle = 'Next task from ' + (repo.taskSourcePath || 'local folder');
                       taskBody = 'Read the next task from the configured local folder.';
                    }

                    if (taskTitle) {
                       const promptTemplate = repo.julesPromptTemplate || "Start with the next task: {{task_title}}. Details: {{task_body}}.";
                       const prompt = promptTemplate
                         .replace(/\{\{task_title\}\}/g, taskTitle)
                         .replace(/\{\{task_body\}\}/g, taskBody);

                       const sessionResponse = await createSession(
                         settings.julesApiKey,
                         prompt,
                         `github.com/${repo.owner}/${repo.name}`,
                         sourceRevision || 'refs/heads/main'
                       );
                       logger.info(`Successfully started Jules session for ${repo.owner}/${repo.name}`);

                       // Extract task ID and post a comment on the original issue so forwardCommentsToJules can find it
                       if (sessionResponse && sessionResponse.name) {
                         const taskIdMatch = sessionResponse.name.match(/sessions\/(\d+)/);
                         const taskId = taskIdMatch ? taskIdMatch[1] : sessionResponse.id;

                         // We saved the issue number in sourceRevision e.g. "refs/heads/123-fix"
                         const issueNumMatch = sourceRevision.match(/refs\/heads\/(\d+)-fix/);
                         if (taskId && issueNumMatch) {
                           const issueNumber = parseInt(issueNumMatch[1], 10);
                           const julesLink = `https://jules.google.com/task/${taskId}`;
                           try {
                             await octokit.rest.issues.createComment({
                               owner: repo.owner,
                               repo: repo.name,
                               issue_number: issueNumber,
                               body: `*Task started in Jules: [${julesLink}](${julesLink})*`
                             });
                           } catch (commentErr) {
                             logger.warn(`Failed to post Jules session link to issue ${issueNumber}`, commentErr);
                           }
                         }
                       }
                    } else {
                       logger.info(`No pending tasks found for ${repo.owner}/${repo.name} (${repo.taskSourceType})`);
                    }
                  } catch (e) {
                    logger.error(`Failed to schedule next Jules task:`, e);
                  }
                }


                // Skip the comment gathering if we just merged it.
                continue;
              }
            }
          } catch (error: any) {
            logger.error(`Failed to auto-merge PR #${pr.number}:`, error.message);
            // We shouldn't fail the whole loop on one auto-merge fail
            // Also log to DB if it's not already merged

            let status = 'FAILED';
            let msg = error.message;

            if (error.status === 405) {
               status = 'SKIPPED';
               msg = 'Method Not Allowed (Not mergeable)';
            }

            // Log less frequently or just log as skipped
            try {
              const existingLog = await prisma.autoMergeLog.findFirst({
                where: {
                  repoOwner: repo.owner,
                  repoName: repo.name,
                  prNumber: pr.number,
                  status
                },
                orderBy: { createdAt: 'desc' }
              });

              // Only log if we haven't logged this exact status in the last 15 minutes
              const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
              if (!existingLog || existingLog.createdAt < fifteenMinsAgo || existingLog.message !== msg) {
                await prisma.autoMergeLog.create({
                  data: {
                    repoOwner: repo.owner,
                    repoName: repo.name,
                    prNumber: pr.number,
                    status,
                    message: msg
                  }
                });
              }
            } catch (logError) {
              logger.error('Failed to log auto-merge error:', logError);
            }
          }
        }

        if (reviewers.length === 0) continue; // Skip comment aggregation if no target reviewers

        // Fetch Issue Comments
        const { data: issueComments } = await octokit.rest.issues.listComments({
          owner: repo.owner,
          repo: repo.name,
          issue_number: pr.number,
          per_page: 100
        })

        // Fetch Pull Request Review Comments
        const { data: reviewComments } = await octokit.rest.pulls.listReviewComments({
          owner: repo.owner,
          repo: repo.name,
          pull_number: pr.number,
          per_page: 100
        })

        // Fetch Pull Request Reviews (some bots leave bodies in reviews instead of comments)
        const { data: reviews } = await octokit.rest.pulls.listReviews({
          owner: repo.owner,
          repo: repo.name,
          pull_number: pr.number,
          per_page: 100
        })

        const allComments = [
          ...issueComments.map((c: any) => ({
            id: BigInt(c.id),
            nodeId: c.node_id,
            source: 'issue',
            user: c.user,
            body: c.body,
            created_at: c.created_at
          })),
          ...reviewComments.map((c: any) => ({
            id: BigInt(c.id),
            nodeId: c.node_id,
            source: 'review_comment',
            user: c.user,
            body: c.body,
            created_at: c.created_at
          })),
          ...reviews.filter((r: any) => r.body).map((c: any) => ({
            id: BigInt(c.id),
            nodeId: c.node_id,
            source: 'review',
            user: c.user,
            body: c.body as string, // filtered above
            created_at: c.submitted_at || new Date().toISOString()
          }))
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        for (const comment of allComments) {
          if (!comment.user || !comment.body) continue;

          const normalizeUser = (name: string) => name.toLowerCase().replace(/\[bot\]$/, '');
          const commentUserLogin = normalizeUser(comment.user!.login);
          const reviewerConfig = reviewers.find(r => normalizeUser(r.username) === commentUserLogin);
          if (reviewerConfig) {
            const exists = await prisma.processedComment.findUnique({
              where: { commentId_source: { commentId: comment.id, source: comment.source } }
            });

            if (!exists) {
              let isSkipped = false;
              if (reviewerConfig.compiledRegex) {
                  // Prevent ReDoS by truncating extremely long bodies
                  const safeBody = comment.body.slice(0, 10000);
                  if (reviewerConfig.compiledRegex.test(safeBody)) {
                    logger.info(`Skipping comment from ${comment.user.login} on PR #${pr.number} due to noActionRegex match.`);
                    isSkipped = true;
                  }
              }

              if (isSkipped) {
                await prisma.processedComment.create({
                  data: {
                    commentId: comment.id,
                    nodeId: comment.nodeId,
                    source: comment.source,
                    prNumber: pr.number,
                    repoOwner: repo.owner,
                    repoName: repo.name,
                    author: comment.user.login,
                    body: comment.body,
                    postedAt: new Date(comment.created_at),
                    isSkipped: true
                  }
                });
                continue;
              }
              logger.info(`Found new comment from ${comment.user.login} on PR #${pr.number}`)

              const postedAt = new Date(comment.created_at)

              await prisma.processedComment.create({
                data: {
                  commentId: comment.id,
                  nodeId: comment.nodeId,
                  source: comment.source,
                  prNumber: pr.number,
                  repoOwner: repo.owner,
                  repoName: repo.name,
                  author: comment.user.login,
                  body: comment.body,
                  postedAt
                }
              })

              // Look for an existing unprocessed session
              const existingSession = await prisma.batchSession.findFirst({
                where: {
                  prNumber: pr.number,
                  repoOwner: repo.owner,
                  repoName: repo.name,
                  isProcessed: false
                }
              })

              if (!existingSession) {
                await prisma.batchSession.create({
                  data: {
                    prNumber: pr.number,
                    repoOwner: repo.owner,
                    repoName: repo.name,
                    firstSeenAt: postedAt // Crucial fix: tie delay to the comment creation time
                  }
                })
              }
            }
          }
        }
      }
    }

    const now = new Date().getTime()

    const pendingSessions = await prisma.batchSession.findMany({
      where: { isProcessed: false, isProcessing: false }
    })


    for (const session of pendingSessions) {
      const timeSinceFirstSeen = now - new Date(session.firstSeenAt).getTime()

      // Fetch repo config for the current session to get delays/required bots
      const repoConfig = await prisma.repository.findUnique({
        where: { owner_name: { owner: session.repoOwner, name: session.repoName } }
      });

      const repoDelay = repoConfig?.batchDelay;
      const effectiveDelayMin = repoDelay != null ? repoDelay : (settings?.batchDelay ?? 5);
      const batchDelayMs = effectiveDelayMin * 60 * 1000;

      // Fetch comments to see if required bots have responded
      const commentsToBatch = await prisma.processedComment.findMany({
        where: {
          prNumber: session.prNumber,
          repoOwner: session.repoOwner,
          repoName: session.repoName,
          postedAt: { gte: session.firstSeenAt },
          isSkipped: false
        },
        orderBy: { postedAt: 'asc' }
      })

      // Smart Wait Logic
      let shouldProcess = false;
      const MAX_WAIT_MS = 30 * 60 * 1000; // 30 minutes absolute timeout

      if (session.forceProcess) {
        shouldProcess = true;
      } else if (timeSinceFirstSeen >= MAX_WAIT_MS) {
        shouldProcess = true; // Timeout reached
      } else if (repoConfig?.requiredBots) {
        // Required Bots evaluation
        const norm = (s: string) => s.toLowerCase().replace(/\[bot\]$/, '');
        const requiredList = repoConfig.requiredBots.split(',').map((b: string) => norm(b.trim())).filter((b: string) => b.length > 0);
        const seenBots = commentsToBatch.map(c => norm(c.author));
        const missingBots = requiredList.filter((rb: string) => !seenBots.includes(rb));

        if (missingBots.length === 0) {
           shouldProcess = true; // All required bots have commented
        } else {
           logger.info(`PR #${session.prNumber} is waiting for required bots: ${missingBots.join(', ')}`);
        }
      } else if (timeSinceFirstSeen >= batchDelayMs) {
        // Classic batch delay
        shouldProcess = true;
      }

      if (shouldProcess) {
        logger.info(`Processing batch for PR #${session.prNumber} in ${session.repoOwner}/${session.repoName}...`)

        // Atomically claim this session
        const claimed = await prisma.batchSession.updateMany({
          where: {
            id: session.id,
            isProcessed: false,
            isProcessing: false
          },
          data: {
            isProcessing: true
          }
        })

        if (claimed.count === 0) continue; // Someone else claimed it

        try {
          const aiSystemPrompt = repoConfig?.aiSystemPrompt;
          const commentTemplate = repoConfig?.commentTemplate;

          if (commentsToBatch.length > 0) {

            const tokenToUse = repoConfig?.githubToken || settings?.githubToken;
            if (!tokenToUse) {
               throw new Error('No github token available to post comment');
            }
            const octokit = createOctokit(tokenToUse);

            const aggregatedBody = formatAggregatedBody(commentsToBatch, aiSystemPrompt, commentTemplate);

            if (repoConfig?.postAggregatedComments !== false) {
              await octokit.rest.issues.createComment({
                owner: session.repoOwner,
                repo: session.repoName,
                issue_number: session.prNumber,
                body: aggregatedBody
              })
              logger.info(`Successfully posted aggregated comment to PR #${session.prNumber}`)
            } else {
              logger.info(`Skipped posting aggregated comment to PR #${session.prNumber} because postAggregatedComments is disabled`)
            }

            try {
              // Minimize original bot comments using GraphQL ONLY if we posted an aggregated comment
              const minimizableComments = repoConfig?.postAggregatedComments !== false
                ? commentsToBatch.filter((c: any) => c.source !== 'review' && c.nodeId)
                : [];
              if (minimizableComments.length > 0) {
                  const chunkSize = 20;
                  for (let i = 0; i < minimizableComments.length; i += chunkSize) {
                      const chunk = minimizableComments.slice(i, i + chunkSize);
                      let queryFields = '';
                      const variables: Record<string, string> = {};

                      chunk.forEach((comment: any, index: number) => {
                          queryFields += `m${index}: minimizeComment(input: { subjectId: $id${index}, classifier: RESOLVED }) {
                            minimizedComment { isMinimized }
                          }\n`;
                          variables[`id${index}`] = comment.nodeId;
                      });

                      const queryArgs = chunk.map((_: any, j: number) => `$id${j}: ID!`).join(', ');
                      const mutation = `mutation(${queryArgs}) { ${queryFields} }`;

                      try {
                          const response: any = await octokit.graphql(mutation, variables);
                          chunk.forEach((comment: any, index: number) => {
                              const alias = `m${index}`;
                              if (response[alias] && response[alias].minimizedComment && response[alias].minimizedComment.isMinimized) {
                                  logger.info(`Minimized original comment ${comment.commentId} from ${comment.author}`);
                              } else {
                                  logger.warn(`Failed to verify minimization for comment ${comment.commentId} from ${comment.author}`);
                              }
                          });
                      } catch (minErr: any) {
                          logger.error(`Failed to minimize chunk of comments, falling back to sequential minimization:`, minErr.message);
                          for (const comment of chunk) {
                              try {
                                  await octokit.graphql(
                                      `mutation($subjectId: ID!) {
                                          minimizeComment(input: { subjectId: $subjectId, classifier: RESOLVED }) {
                                              minimizedComment { isMinimized }
                                          }
                                      }`,
                                      { subjectId: comment.nodeId }
                                  );
                                  logger.info(`Fallback: Minimized original comment ${comment.commentId} from ${comment.author}`);
                              } catch (fallbackErr: any) {
                                  logger.error(`Fallback failed to minimize comment ${comment.commentId}:`, fallbackErr.message);
                              }
                          }
                      }
                  }
              }
            } catch (e) {
              logger.error(`Failed to minimize comments for PR #${session.prNumber}:`, e);
            }


            try {
              await forwardCommentsToJules(session, aggregatedBody, settings, prisma, octokit, repoConfig)
            } catch (e) {
              const actionStr = repoConfig?.postAggregatedComments !== false ? "(aggregated comment posted)" : "(aggregated comment posting disabled)";
              logger.error(`Failed to forward comments to Jules for PR #${session.prNumber} ${actionStr}:`, e)
            }
          }

          // Mark as fully processed


          await prisma.batchSession.update({
            where: { id: session.id },
            data: { isProcessed: true, isProcessing: false, forceProcess: false }
          })
        } catch (error) {
          logger.error(`Failed to process batch for PR #${session.prNumber}:`, error)
          // Revert claim on failure so it can be retried


          await prisma.batchSession.update({
            where: { id: session.id },
            data: { isProcessing: false, forceProcess: false }
          })
        }
      }
    }

  } catch (error) {
    logger.error('Error during polling cycle:', error)
  } finally {
    isRunning = false;
  }
}


async function processWebhooks() {
    try {
        const signals = await prisma.webhookSignal.findMany({
            take: 10
        });

        if (signals.length === 0) return;

        logger.info(`Found ${signals.length} webhook signals. Processing...`);

        const prsToProcess = signals.map(s => ({
            owner: s.repoOwner,
            name: s.repoName,
            prNumber: s.prNumber
        }));

        // Delete processed signals
        const signalIds = signals.map(s => s.id);
        await prisma.webhookSignal.deleteMany({
            where: { id: { in: signalIds } }
        });

        if (!isRunning) {
            void processRepositories(prsToProcess);
        }

    } catch (err) {
        logger.error('Error processing webhooks:', err);
    }
}

async function start() {
  logger.info('Cleaning up any stuck processing sessions from previous runs...')
  try {
    await prisma.batchSession.updateMany({
      where: { isProcessing: true },
      data: { isProcessing: false, forceProcess: false }
    })
  } catch (err) {
    logger.error('Failed to clean up stuck sessions:', err)
  }

  // Setup interval for failsafe forwarding
  setInterval(async () => {
    logger.info('Running failsafe forwarding for Jules...')
    try {
      await processFailsafeForwarding()
    } catch (err) {
      logger.error('Failsafe forwarding task failed:', err)
    }
  }, 5 * 60 * 1000) // run every 5 minutes

  // Setup webhook polling (every 5 seconds)
  setInterval(async () => {
    await processWebhooks()
  }, 5 * 1000)

  // Setup auto-pruning (run daily at midnight)
  cron.schedule('0 0 * * *', async () => {
      logger.info('Running database auto-pruning...');
      try {
          const currentSettings = await prisma.settings.findUnique({ where: { id: 1 } });
          const pruneDays = currentSettings?.pruneDays ?? 60;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - pruneDays);

          const result = await prisma.processedComment.deleteMany({
              where: {
                  postedAt: {
                      lt: cutoffDate
                  }
              }
          });
          logger.info(`Pruned ${result.count} old comments from the database.`);
      } catch (err) {
          logger.error('Failed to run auto-pruning:', err);
      }
  }, { timezone: 'UTC' });

  // Run failsafe forwarding on boot
  logger.info('Running failsafe forwarding for Jules on boot...')
  try {
    await processFailsafeForwarding()
  } catch (err) {
    logger.error('Failsafe forwarding boot task failed:', err)
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  const interval = settings?.pollingInterval || 60

  logger.info(`Starting worker with polling interval: ${interval}s`)

  if (interval < 60) {
    const cronExpression = `*/${interval} * * * * *`
    try {
      cron.schedule(cronExpression, () => {
        void processRepositories()
      })
      // Trigger immediate first run for consistency
      void processRepositories()
    } catch (err) {
      logger.error('Failed to schedule cron job:', err)
    }
  } else {
    // For 60s or more, use setInterval directly.
    // This correctly handles larger polling intervals without node-cron second-field limitations.
    setInterval(() => {
      void processRepositories()
    }, interval * 1000)

    // Trigger immediate first run
    void processRepositories()
  }
}

void start()


async function forwardCommentsToJules(session: { repoOwner: string, repoName: string, prNumber: number, firstSeenAt: Date }, aggregatedBody: string, settings: { julesApiKey: string | null } | null, prisma: PrismaClient, octokit: Octokit, repoConfig: any) {
  if (repoConfig && repoConfig.julesChatForwardMode !== "off" && settings?.julesApiKey) {
    try {
      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: session.repoOwner,
        repo: session.repoName,
        pull_number: session.prNumber
      })
      const sessionIdMatch = pullRequest.body?.match(/jules\.google\.com\/task\/(\d+)/)
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1]
        if (repoConfig.julesChatForwardMode === "always") {
          await sendMessage(settings?.julesApiKey, sessionId, aggregatedBody)
          await prisma.processedComment.updateMany({
            where: {
              prNumber: session.prNumber,
              repoOwner: session.repoOwner,
              repoName: session.repoName,
              postedAt: { gte: session.firstSeenAt },
              isSkipped: false
            },
            data: { forwardedToJules: true }
          })
          logger.info(`Forwarded aggregated comment to Jules session ${sessionId}`)
        }
      }
    } catch (e) {
      logger.error(`Failed to forward comment to Jules:`, e)
      throw e; // Rethrow to let the outer batch processor handle the failure (revert claim for retry)
    }
  }
}
