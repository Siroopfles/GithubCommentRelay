import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { payload, options } = await request.json();
    const { data } = payload;
    const { forceOverwrite, importSettings, importRepos, importReviewers, importBots } = options;

    const results = {
      settings: { updated: 0 },
      repositories: { added: 0, updated: 0, skipped: 0 },
      reviewers: { added: 0, updated: 0, skipped: 0 },
      botMappings: { added: 0, updated: 0, skipped: 0 },
    };

    // 1. Settings
    if (importSettings && data.settings) {
       const { id, updatedAt, githubToken, julesApiKey, webhookSecret, ...safeSettings } = data.settings;
       await prisma.settings.upsert({
         where: { id: 1 },
         update: safeSettings,
         create: { id: 1, ...safeSettings }
       });
       results.settings.updated = 1;
    }

    // 2. Reviewers
    if (importReviewers && Array.isArray(data.reviewers)) {
      for (const reviewer of data.reviewers) {
        const existing = await prisma.targetReviewer.findUnique({ where: { username: reviewer.username } });
        if (existing) {
          if (forceOverwrite) {
             await prisma.targetReviewer.update({
               where: { username: reviewer.username },
               data: { isActive: reviewer.isActive, noActionRegex: reviewer.noActionRegex }
             });
             results.reviewers.updated++;
          } else {
             results.reviewers.skipped++;
          }
        } else {
           await prisma.targetReviewer.create({
             data: { username: reviewer.username, isActive: reviewer.isActive, noActionRegex: reviewer.noActionRegex }
           });
           results.reviewers.added++;
        }
      }
    }

    // 3. Bot Mappings
    if (importBots && Array.isArray(data.botMappings)) {
      for (const bot of data.botMappings) {
        const existing = await prisma.botAgentMapping.findUnique({ where: { botSource: bot.botSource } });
        if (existing) {
          if (forceOverwrite) {
             await prisma.botAgentMapping.update({
               where: { botSource: bot.botSource },
               data: { agentName: bot.agentName, role: bot.role }
             });
             results.botMappings.updated++;
          } else {
             results.botMappings.skipped++;
          }
        } else {
           await prisma.botAgentMapping.create({
             data: { botSource: bot.botSource, agentName: bot.agentName, role: bot.role }
           });
           results.botMappings.added++;
        }
      }
    }

    // 4. Repositories
    if (importRepos && Array.isArray(data.repositories)) {
       for (const repo of data.repositories) {
          const { id, createdAt, promptTemplates, prLabelRules, ...repoData } = repo;
          const existing = await prisma.repository.findUnique({ where: { owner_name: { owner: repo.owner, name: repo.name } } });

          if (existing) {
             if (forceOverwrite) {
                await prisma.repository.update({
                  where: { id: existing.id },
                  data: repoData
                });
                results.repositories.updated++;
             } else {
                results.repositories.skipped++;
             }
          } else {
             await prisma.repository.create({
               data: repoData
             });
             results.repositories.added++;
          }
       }
    }

    await prisma.auditLog.create({ data: { action: 'IMPORT_CONFIG', entity: 'System', details: JSON.stringify(results) } });
    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json({ error: 'Internal server error during import' }, { status: 500 });
  }
}
