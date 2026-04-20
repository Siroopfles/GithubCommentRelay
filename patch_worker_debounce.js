const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

code = code.replace(
  `function createOctokit(token: string) {
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

            try {
              await prisma.settings.update({
                where: { id: 1 },
                data: {
                  githubRateLimitRemaining: limit,
                  githubRateLimitReset: reset
                }
              });
            } catch (dbErr) {
              logger.error('Failed to update rate limit in DB:', dbErr);
            }

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
}`,
  `
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
                logger.warn(\`GitHub API rate limit is critically low: \${limit} remaining. Resets at \${reset.toISOString()}\`);
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
}`
);

// Implement actual pause behavior
code = code.replace(
  "// Pausing based on global limit only for simplicity. Real implementation could track per-token.",
  `if (settings.githubRateLimitRemaining !== null && settings.githubRateLimitRemaining < 50) {
      if (settings.githubRateLimitReset && new Date() < settings.githubRateLimitReset) {
          logger.warn(\`Skipping run due to low rate limit (\${settings.githubRateLimitRemaining} remaining). Resets at \${settings.githubRateLimitReset}\`);
          isRunning = false;
          return;
      }
  }`
);


fs.writeFileSync('worker.ts', code);
