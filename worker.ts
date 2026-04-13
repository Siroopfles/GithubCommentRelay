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
      return
    }

    const repos = await prisma.repository.findMany({ where: { isActive: true } })
    const reviewers = await prisma.targetReviewer.findMany({ where: { isActive: true } })

    if (repos.length === 0 || reviewers.length === 0) {
      console.log('Skipping cycle: No active repositories or reviewers configured.')
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
        if (pr.user?.login !== currentUser.login) continue;

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

        // Unify all comments
        const allComments = [
          ...issueComments.map(c => ({
            id: c.id,
            user: c.user,
            body: c.body,
            created_at: c.created_at
          })),
          ...reviewComments.map(c => ({
            id: c.id,
            user: c.user,
            body: c.body,
            created_at: c.created_at
          })),
          ...reviews.filter(r => r.body).map(c => ({
            id: c.id,
            user: c.user,
            body: c.body as string, // filtered above
            created_at: c.submitted_at || new Date().toISOString()
          }))
        ];

        for (const comment of allComments) {
          if (!comment.user || !comment.body) continue;

          if (reviewerUsernames.includes(comment.user.login.toLowerCase())) {
            const exists = await prisma.processedComment.findUnique({
              where: { commentId: comment.id }
            })

            if (!exists) {
              console.log(`Found new comment from ${comment.user.login} on PR #${pr.number}`)

              const postedAt = new Date(comment.created_at)

              await prisma.processedComment.create({
                data: {
                  commentId: comment.id,
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
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  const interval = settings?.pollingInterval || 60

  console.log(`Starting worker with polling interval: ${interval}s`)

  if (interval < 60) {
    const cronExpression = `*/${interval} * * * * *`
    try {
      cron.schedule(cronExpression, () => {
        void processRepositories()
      })
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
