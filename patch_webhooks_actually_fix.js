const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

code = code.replace(
  `        // Delete processed signals
        const signalIds = signals.map(s => s.id);
        await prisma.webhookSignal.deleteMany({
            where: { id: { in: signalIds } }
        });

        if (!isRunning) {
            void processRepositories(prsToProcess);
        }`,
  `        if (isRunning) {
            return; // Leave signals; next tick will retry
        }

        const signalIds = signals.map(s => s.id);
        await prisma.webhookSignal.deleteMany({ where: { id: { in: signalIds } } });
        void processRepositories(prsToProcess);`
);

fs.writeFileSync('worker.ts', code);
