import { PrismaClient } from '@prisma/client'
import { sendMessage } from './src/lib/julesApi'
import { Octokit } from 'octokit'

export async function processFailsafeForwarding(prisma: PrismaClient, octokit: Octokit, settings: any) {
  if (!settings?.julesApiKey) return;

  const repositories = await prisma.repository.findMany({
    where: { isActive: true, julesChatForwardMode: 'failsafe' }
  });

  const now = new Date();

  for (const repo of repositories) {
    const delayMs = repo.julesChatForwardDelay * 60 * 1000;
    const cutoffTime = new Date(now.getTime() - delayMs);

    // Find comments that haven't been forwarded, but have been processed (batched) and are older than the delay
    const pendingComments = await prisma.processedComment.findMany({
      where: {
        repoOwner: repo.owner,
        repoName: repo.name,
        forwardedToJules: false,
        processedAt: { lte: cutoffTime }
      }
    });

    if (pendingComments.length === 0) continue;

    // Group by PR
    const prGroups = pendingComments.reduce((acc: any, comment) => {
      if (!acc[comment.prNumber]) acc[comment.prNumber] = [];
      acc[comment.prNumber].push(comment);
      return acc;
    }, {});

    for (const prNumberStr of Object.keys(prGroups)) {
      const prNumber = parseInt(prNumberStr, 10);
      const comments = prGroups[prNumber];

      try {
        const { data: pullRequest } = await octokit.rest.pulls.get({
          owner: repo.owner,
          repo: repo.name,
          pull_number: prNumber
        });

        const sessionIdMatch = pullRequest.body?.match(/jules\.google\.com\/task\/(\d+)/);
        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1];
          let aggregatedBody = `### 🤖 Auto-Forwarded Failsafe Comments\n\n`;
          for (const c of comments) {
            aggregatedBody += `#### From **@${c.author}**:\n${c.body}\n\n---\n\n`;
          }

          console.log(`Failsafe forwarding ${comments.length} comments to Jules PR #${prNumber}`);
          await sendMessage(settings.julesApiKey, sessionId, aggregatedBody);

          // Mark as forwarded
          await prisma.processedComment.updateMany({
            where: { id: { in: comments.map((c: any) => c.id) } },
            data: { forwardedToJules: true }
          });
        } else {
          // If there is no session ID, mark them as forwarded to prevent infinite retry
          await prisma.processedComment.updateMany({
            where: { id: { in: comments.map((c: any) => c.id) } },
            data: { forwardedToJules: true }
          });
        }
      } catch (e) {
        console.error(`Failsafe forwarding failed for PR #${prNumber}:`, e);
      }
    }
  }
}
