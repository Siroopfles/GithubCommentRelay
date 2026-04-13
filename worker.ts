import { PrismaClient } from '@prisma/client'
import { Octokit } from 'octokit'
// @ts-ignore
import cron from 'node-cron'

const prisma = new PrismaClient()

async function getOctokit() {
  const settings = await prisma.settings.findFirst()
  if (!settings?.githubToken) {
    throw new Error('GitHub token not configured')
  }
  return new Octokit({ auth: settings.githubToken })
}

async function processRepositories() {
  console.log(`[${new Date().toISOString()}] Starting polling cycle...`)

  try {
    const settings = await prisma.settings.findFirst()
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
    // Fetch currently authenticated user
    const { data: currentUser } = await octokit.rest.users.getAuthenticated()

    for (const repo of repos) {
      console.log(`Checking ${repo.owner}/${repo.name}...`)

      // Get recent open PRs
      const { data: prs } = await octokit.rest.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: 20
      })

      for (const pr of prs) {
        // Skip PRs not opened by the authenticated user
        if (pr.user?.login !== currentUser.login) continue;

        const { data: comments } = await octokit.rest.issues.listComments({
          owner: repo.owner,
          repo: repo.name,
          issue_number: pr.number,
          per_page: 100
        })

        for (const comment of comments) {
          if (!comment.user || !comment.body) continue;

          if (reviewerUsernames.includes(comment.user.login.toLowerCase())) {
            // Check if already processed
            const exists = await prisma.processedComment.findUnique({
              where: { commentId: comment.id }
            })

            if (!exists) {
              console.log(`Found new comment from ${comment.user.login} on PR #${pr.number}`)

              // Register new comment
              await prisma.processedComment.create({
                data: {
                  commentId: comment.id,
                  prNumber: pr.number,
                  repoOwner: repo.owner,
                  repoName: repo.name,
                  author: comment.user.login,
                  body: comment.body,
                  postedAt: new Date(comment.created_at)
                }
              })

              // Create or update batch session
              await prisma.batchSession.upsert({
                where: {
                  prNumber_repoOwner_repoName_isProcessed: {
                    prNumber: pr.number,
                    repoOwner: repo.owner,
                    repoName: repo.name,
                    isProcessed: false
                  }
                },
                update: {}, // Keep existing firstSeenAt
                create: {
                  prNumber: pr.number,
                  repoOwner: repo.owner,
                  repoName: repo.name,
                  firstSeenAt: new Date()
                }
              })
            }
          }
        }
      }
    }

    // Process pending batches
    const batchDelayMs = (settings.batchDelay || 5) * 60 * 1000
    const now = new Date().getTime()

    const pendingSessions = await prisma.batchSession.findMany({
      where: { isProcessed: false }
    })

    for (const session of pendingSessions) {
      const timeSinceFirstSeen = now - new Date(session.firstSeenAt).getTime()

      if (timeSinceFirstSeen >= batchDelayMs) {
        console.log(`Processing batch for PR #${session.prNumber} in ${session.repoOwner}/${session.repoName}...`)

        // Get all unprocessed comments for this PR
        const commentsToBatch = await prisma.processedComment.findMany({
          where: {
            prNumber: session.prNumber,
            repoOwner: session.repoOwner,
            repoName: session.repoName,
            // Only grab comments that were posted since the session started (roughly)
            postedAt: { gte: session.firstSeenAt }
          },
          orderBy: { postedAt: 'asc' }
        })

        if (commentsToBatch.length > 0) {
          // Construct the aggregated message
          let aggregatedBody = `### 🤖 Automated Reviewer Comments Aggregated\n\n`

          for (const comment of commentsToBatch) {
            aggregatedBody += `#### From **@${comment.author}**:\n`
            aggregatedBody += `${comment.body}\n\n---\n\n`
          }

          // Post to GitHub
          await octokit.rest.issues.createComment({
            owner: session.repoOwner,
            repo: session.repoName,
            issue_number: session.prNumber,
            body: aggregatedBody
          })
          console.log(`Successfully posted aggregated comment to PR #${session.prNumber}`)
        }

        // Mark session as processed
        await prisma.batchSession.update({
          where: { id: session.id },
          data: { isProcessed: true }
        })
      }
    }

  } catch (error) {
    console.error('Error during polling cycle:', error)
  }
}

async function start() {
  const settings = await prisma.settings.findFirst()
  const interval = settings?.pollingInterval || 60

  // Calculate cron expression based on seconds
  // Note: node-cron supports seconds resolution
  const cronExpression = `*/${interval} * * * * *`

  console.log(`Starting worker with polling interval: ${interval}s`)

  cron.schedule(cronExpression, () => {
    void processRepositories()
  })
}

void start()
