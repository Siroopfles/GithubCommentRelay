import { PrismaClient } from '@prisma/client'
import { processFailsafeForwarding } from "./patch_failsafe";
import { formatAggregatedBody } from "./src/lib/format_helper";
import { createSession, sendMessage } from "./src/lib/julesApi";
import { prisma } from './src/lib/prisma'
import { Octokit } from 'octokit'
// @ts-ignore
import cron from 'node-cron'

async function getOctokit() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!settings?.githubToken) {
    throw new Error('GitHub token not configured')
  }
  return new Octokit({ auth: settings.githubToken })
}

let isRunning = false;

async function processRepositories() {
  if (isRunning) {
    console.log(`[${new Date().toISOString()}] Previous cycle still running, skipping...`);
    return;
  }
  isRunning = true;

  console.log(`[${new Date().toISOString()}] Starting polling cycle...`)

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } })
    if (!settings?.githubToken) {
      console.log('Skipping cycle: GitHub Token not configured.')
      isRunning = false;
      return
    }

    const repos = await prisma.repository.findMany({ where: { isActive: true } })
    const reviewers = await prisma.targetReviewer.findMany({ where: { isActive: true } })

    if (repos.length === 0) {
      console.log('Skipping cycle: No active repositories configured.')
      isRunning = false;
      return
    }

    const reviewerUsernames = reviewers.map(r => r.username.toLowerCase())
    const octokit = await getOctokit()
    const { data: currentUser } = await octokit.rest.users.getAuthenticated()

    for (const repo of repos) {
      console.log(`Checking ${repo.owner}/${repo.name}...`)

      const { data: prs } = await octokit.rest.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: 20
      })

      for (const pr of prs) {
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
                  run => run.status === 'completed' && (run.conclusion === 'success' || run.conclusion === 'skipped' || run.conclusion === 'neutral')
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
                console.log(`Auto-merging PR #${pr.number} for ${repo.owner}/${repo.name}...`);
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
                  console.error('Failed to log auto-merge success:', logError);
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
                            console.warn(`Failed to label issue ${actualIssue.number} as scheduled. Skipping to prevent duplicates.`, labelErr);
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
                       console.log(`Successfully started Jules session for ${repo.owner}/${repo.name}`);

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
                             console.warn(`Failed to post Jules session link to issue ${issueNumber}`, commentErr);
                           }
                         }
                       }
                    } else {
                       console.log(`No pending tasks found for ${repo.owner}/${repo.name} (${repo.taskSourceType})`);
                    }
                  } catch (e) {
                    console.error(`Failed to schedule next Jules task:`, e);
                  }
                }


                // Skip the comment gathering if we just merged it.
                continue;
              }
            }
          } catch (error: any) {
            console.error(`Failed to auto-merge PR #${pr.number}:`, error.message);
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
              console.error('Failed to log auto-merge error:', logError);
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
          ...issueComments.map(c => ({
            id: BigInt(c.id),
            source: 'issue',
            user: c.user,
            body: c.body,
            created_at: c.created_at
          })),
          ...reviewComments.map(c => ({
            id: BigInt(c.id),
            source: 'review_comment',
            user: c.user,
            body: c.body,
            created_at: c.created_at
          })),
          ...reviews.filter(r => r.body).map(c => ({
            id: BigInt(c.id),
            source: 'review',
            user: c.user,
            body: c.body as string, // filtered above
            created_at: c.submitted_at || new Date().toISOString()
          }))
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        for (const comment of allComments) {
          if (!comment.user || !comment.body) continue;

          if (reviewerUsernames.includes(comment.user.login.toLowerCase())) {
            const exists = await prisma.processedComment.findUnique({
              where: { commentId_source: { commentId: comment.id, source: comment.source } }
            })

            if (!exists) {
              console.log(`Found new comment from ${comment.user.login} on PR #${pr.number}`)

              const postedAt = new Date(comment.created_at)

              await prisma.processedComment.create({
                data: {
                  commentId: comment.id,
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

    const batchDelayMs = (settings.batchDelay || 5) * 60 * 1000
    const now = new Date().getTime()

    const pendingSessions = await prisma.batchSession.findMany({
      where: { isProcessed: false, isProcessing: false }
    })

    for (const session of pendingSessions) {
      const timeSinceFirstSeen = now - new Date(session.firstSeenAt).getTime()

      if (timeSinceFirstSeen >= batchDelayMs) {
        console.log(`Processing batch for PR #${session.prNumber} in ${session.repoOwner}/${session.repoName}...`)

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
          // Get repository configuration for templates and prompts
          const repoConfig = await prisma.repository.findUnique({
            where: { owner_name: { owner: session.repoOwner, name: session.repoName } }
          });
          const aiSystemPrompt = repoConfig?.aiSystemPrompt;
          const commentTemplate = repoConfig?.commentTemplate;

          const commentsToBatch = await prisma.processedComment.findMany({
            where: {
              prNumber: session.prNumber,
              repoOwner: session.repoOwner,
              repoName: session.repoName,
              postedAt: { gte: session.firstSeenAt }
            },
            orderBy: { postedAt: 'asc' }
          })

          if (commentsToBatch.length > 0) {
            const aggregatedBody = formatAggregatedBody(commentsToBatch, aiSystemPrompt, commentTemplate);

            await octokit.rest.issues.createComment({
              owner: session.repoOwner,
              repo: session.repoName,
              issue_number: session.prNumber,
              body: aggregatedBody
            })
            console.log(`Successfully posted aggregated comment to PR #${session.prNumber}`)

            try {
              await forwardCommentsToJules(session, aggregatedBody, settings, prisma, octokit)
            } catch (e) {
              console.error(`Failed to forward comments to Jules for PR #${session.prNumber}, but comment was posted:`, e)
            }
          }

          // Mark as fully processed


          await prisma.batchSession.update({
            where: { id: session.id },
            data: { isProcessed: true, isProcessing: false }
          })
        } catch (error) {
          console.error(`Failed to process batch for PR #${session.prNumber}:`, error)
          // Revert claim on failure so it can be retried


          await prisma.batchSession.update({
            where: { id: session.id },
            data: { isProcessing: false }
          })
        }
      }
    }

  } catch (error) {
    console.error('Error during polling cycle:', error)
  } finally {
    isRunning = false;
  }
}

async function start() {
  console.log('Cleaning up any stuck processing sessions from previous runs...')
  try {
    await prisma.batchSession.updateMany({
      where: { isProcessing: true },
      data: { isProcessing: false }
    })
  } catch (err) {
    console.error('Failed to clean up stuck sessions:', err)
  }

  // Setup interval for failsafe forwarding
  setInterval(async () => {
    console.log('Running failsafe forwarding for Jules...')
    try {
      await processFailsafeForwarding()
    } catch (err) {
      console.error('Failsafe forwarding task failed:', err)
    }
  }, 5 * 60 * 1000) // run every 5 minutes

  // Run failsafe forwarding on boot
  console.log('Running failsafe forwarding for Jules on boot...')
  try {
    await processFailsafeForwarding()
  } catch (err) {
    console.error('Failsafe forwarding boot task failed:', err)
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  const interval = settings?.pollingInterval || 60

  console.log(`Starting worker with polling interval: ${interval}s`)

  if (interval < 60) {
    const cronExpression = `*/${interval} * * * * *`
    try {
      cron.schedule(cronExpression, () => {
        void processRepositories()
      })
      // Trigger immediate first run for consistency
      void processRepositories()
    } catch (err) {
      console.error('Failed to schedule cron job:', err)
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


async function forwardCommentsToJules(session: { repoOwner: string, repoName: string, prNumber: number, firstSeenAt: Date }, aggregatedBody: string, settings: { julesApiKey: string | null }, prisma: PrismaClient, octokit: Octokit) {
  const repoConfig = await prisma.repository.findUnique({ where: { owner_name: { owner: session.repoOwner, name: session.repoName } } })
  if (repoConfig && repoConfig.julesChatForwardMode !== "off" && settings.julesApiKey) {
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
          await sendMessage(settings.julesApiKey, sessionId, aggregatedBody)
          await prisma.processedComment.updateMany({
            where: {
              prNumber: session.prNumber,
              repoOwner: session.repoOwner,
              repoName: session.repoName,
              postedAt: { gte: session.firstSeenAt }
            },
            data: { forwardedToJules: true }
          })
          console.log(`Forwarded aggregated comment to Jules session ${sessionId}`)
        }
      }
    } catch (e) {
      console.error(`Failed to forward comment to Jules:`, e)
      throw e; // Rethrow to let the outer batch processor handle the failure (revert claim for retry)
    }
  }
}
