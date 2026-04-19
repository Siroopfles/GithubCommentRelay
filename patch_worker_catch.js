const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

code = code.replace(
  `                    try {
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
                    }`,
  `                    try {
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
                    }`
); // Ensuring this is wrapped, it was done in a previous fix but good to verify. Let's do a more robust patch below.

fs.writeFileSync('worker.ts', code);
