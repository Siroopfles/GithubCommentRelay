import { Octokit } from 'octokit'
import { sendMessage } from './src/lib/julesApi'
import { formatAggregatedBody } from './src/lib/format_helper'
import { prisma } from './src/lib/prisma'

export async function processFailsafeForwarding() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!settings?.julesApiKey || !settings?.githubToken) return

  const octokit = new Octokit({ auth: settings.githubToken })
  const repos = await prisma.repository.findMany({
    where: { isActive: true, julesChatForwardMode: 'failsafe' }
  })

  for (const repo of repos) {
    if (repo.julesChatForwardDelay == null || typeof repo.julesChatForwardDelay === 'undefined') continue
    const forwardDelayMs = repo.julesChatForwardDelay * 60 * 1000
    const batchDelayMs = (settings.batchDelay || 5) * 60 * 1000
    // Failsafe should never fire before the batch delay
    const effectiveDelayMs = Math.max(forwardDelayMs, batchDelayMs)

    const cutoffTime = new Date(Date.now() - effectiveDelayMs)

    const pendingComments = await prisma.processedComment.findMany({
      where: {
        repoOwner: repo.owner,
        repoName: repo.name,
        postedAt: { lte: cutoffTime },
        forwardedToJules: false
      },
      orderBy: { postedAt: 'asc' }
    })

    if (pendingComments.length === 0) continue

    // Group by PR
    const prGroups = pendingComments.reduce((acc, comment) => {
      if (!acc[comment.prNumber]) acc[comment.prNumber] = []
      acc[comment.prNumber].push(comment)
      return acc
    }, {} as Record<number, typeof pendingComments>)

    for (const [prNumberStr, comments] of Object.entries(prGroups)) {
      const prNumber = parseInt(prNumberStr, 10)

      try {
        const { data: pullRequest } = await octokit.rest.pulls.get({
          owner: repo.owner,
          repo: repo.name,
          pull_number: prNumber
        })

        const sessionIdMatch = pullRequest.body?.match(/jules\.google\.com\/task\/(\d+)/)
        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1]

          const aggregatedBody = formatAggregatedBody(comments, repo.aiSystemPrompt, repo.commentTemplate)

          await sendMessage(settings.julesApiKey, sessionId, aggregatedBody)

          await prisma.processedComment.updateMany({
            where: { id: { in: comments.map(c => c.id) } },
            data: { forwardedToJules: true }
          })
          console.log(`[Failsafe] Forwarded ${comments.length} delayed comments to Jules session ${sessionId} for PR #${prNumber}`)
        } else {
          // If no session ID found, mark them as forwarded anyway to avoid infinite retries
          await prisma.processedComment.updateMany({
            where: { id: { in: comments.map(c => c.id) } },
            data: { forwardedToJules: true }
          })
          console.log(`[Failsafe] Marked ${comments.length} comments as forwarded (No Jules Session in PR #${prNumber})`)
        }
      } catch (e) {
        console.error(`[Failsafe] Failed to forward comments for PR #${prNumber}:`, e)
      }
    }
  }
}
