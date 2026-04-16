import { PrismaClient } from '@prisma/client'
import { Octokit } from 'octokit'
import { sendMessage } from './src/lib/julesApi'
import { formatAggregatedBody } from './src/lib/format_helper'

const prisma = new PrismaClient()

export async function processFailsafeForwarding() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!settings?.julesApiKey) return

  const octokit = new Octokit({ auth: settings.githubToken })
  const repos = await prisma.repository.findMany({
    where: { isActive: true, julesChatForwardMode: 'failsafe' }
  })

  for (const repo of repos) {
    if (!repo.julesChatForwardDelay) continue
    const cutoffTime = new Date(Date.now() - repo.julesChatForwardDelay * 60 * 1000)

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
        }
      } catch (e) {
        console.error(`[Failsafe] Failed to forward comments for PR #${prNumber}:`, e)
      }
    }
  }
}
