const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

// 1. Fix webhook deletion logic
code = code.replace(
  `        if (isRunning) {
            return;
        }

        await processRepositories(prsToProcess);

        const signalIds = signals.map(s => s.id);
        await prisma.webhookSignal.deleteMany({ where: { id: { in: signalIds } } });`,
  `        if (isRunning) {
            return;
        }

        const signalIds = signals.map(s => s.id);
        await processRepositories(prsToProcess);

        await prisma.webhookSignal.deleteMany({ where: { id: { in: signalIds } } });`
); // The webhook issue mentioned in the comment is fixed by early returning if isRunning, but we need to pass prsToProcess correctly and only delete AFTER. The code above is already doing this! The PR comment says:
// "await prisma.webhookSignal.deleteMany({ where: { id: { in: signalIds } } });
// if (!isRunning) { void processRepositories(prsToProcess); }"
// But we already patched this to return early if isRunning. Let's make SURE it's exactly what CodeRabbit wants.

fs.writeFileSync('worker.ts', code);
