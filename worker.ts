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
                const { data: prReviews } = await octokit.rest.pulls.listReviews({
                  owner: repo.owner,
                  repo: repo.name,
                  pull_number: pr.number,
                  per_page: 100
                })

                // Group by reviewer and get the latest state
                const reviewerStates = new Map<string, string>();
                for (const review of prReviews) {
                  if (review.user && review.state !== 'DISMISSED' && review.state !== 'COMMENTED' && review.state !== 'PENDING') {
                    reviewerStates.set(review.user.login, review.state);
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
            let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\n\n`

            for (const comment of commentsToBatch) {
              aggregatedBody += `#### From **@${comment.author}**:\n`
              aggregatedBody += `${comment.body}\n\n---\n\n`
            }

            await octokit.rest.issues.createComment({
              owner: session.repoOwner,
              repo: session.repoName,
              issue_number: session.prNumber,
              body: aggregatedBody
            })
            console.log(`Successfully posted aggregated comment to PR #${session.prNumber}`)
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
