const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

// 1. Rate Limit Interceptor
const rateLimitCode = `
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

            await prisma.settings.update({
              where: { id: 1 },
              data: {
                githubRateLimitRemaining: limit,
                githubRateLimitReset: reset
              }
            });

            if (limit < 50) {
                logger.warn(\`GitHub API rate limit is critically low: \${limit} remaining. Resets at \${reset.toLocaleString()}\`);
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

                    await prisma.settings.update({
                    where: { id: 1 },
                    data: {
                        githubRateLimitRemaining: limit,
                        githubRateLimitReset: reset
                    }
                    });
                }
            }
            throw error;
        }
      }
    }
  });
}
`;

code = code.replace(
  'async function processRepositories() {',
  rateLimitCode + '\nasync function processRepositories(webhookPrs?: {owner: string, name: string, prNumber: Int}[]) {'
);

code = code.replace(
  'new Octokit({ auth: token })',
  'createOctokit(token)'
);

// 2. Pause if rate limit is hit
const pauseCheckCode = `
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!settings || (!settings.githubToken && !repositories.some(r => r.githubToken))) {
    logger.info('No global GitHub token found in settings, and no repo-specific tokens. Cannot run.')
    isRunning = false
    return
  }

  if (settings.githubRateLimitRemaining !== null && settings.githubRateLimitRemaining < 50) {
      if (settings.githubRateLimitReset && new Date() < settings.githubRateLimitReset) {
          logger.warn(\`Skipping run due to low rate limit (\${settings.githubRateLimitRemaining} remaining). Resets at \${settings.githubRateLimitReset}\`);
          isRunning = false;
          return;
      }
  }
`;

code = code.replace(
  `const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!settings || (!settings.githubToken && !repositories.some(r => r.githubToken))) {
    logger.info('No global GitHub token found in settings, and no repo-specific tokens. Cannot run.')
    isRunning = false
    return
  }`,
  pauseCheckCode
);

// 3. Webhook Signal processing
const webhookProcessingCode = `
async function processWebhooks() {
    try {
        const signals = await prisma.webhookSignal.findMany({
            take: 10
        });

        if (signals.length === 0) return;

        logger.info(\`Found \${signals.length} webhook signals. Processing...\`);

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
`;

code = code.replace(
  'async function start() {',
  webhookProcessingCode + '\nasync function start() {'
);

// 4. Update the start function to include auto-pruning and webhook polling
code = code.replace(
  '// Run failsafe forwarding on boot',
  `// Setup webhook polling (every 5 seconds)
  setInterval(async () => {
    await processWebhooks()
  }, 5 * 1000)

  // Setup auto-pruning (run daily at midnight)
  cron.schedule('0 0 * * *', async () => {
      logger.info('Running database auto-pruning...');
      try {
          const currentSettings = await prisma.settings.findUnique({ where: { id: 1 } });
          const pruneDays = currentSettings?.pruneDays || 60;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - pruneDays);

          const result = await prisma.processedComment.deleteMany({
              where: {
                  postedAt: {
                      lt: cutoffDate
                  }
              }
          });
          logger.info(\`Pruned \${result.count} old comments from the database.\`);
      } catch (err) {
          logger.error('Failed to run auto-pruning:', err);
      }
  });\n\n  // Run failsafe forwarding on boot`
);

fs.writeFileSync('worker.ts', code);
console.log('Worker Features Patched');
