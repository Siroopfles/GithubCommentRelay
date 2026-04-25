import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

function isAuthenticated(request: NextRequest) { return true; }

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
try {
    const body = await request.json();
    if (!body || !body.payload || !body.options || !body.payload.data) {
      return NextResponse.json({ error: 'Invalid request body structure. Expected { payload: { data: ... }, options: ... }' }, { status: 400 });
    }
    const { payload, options } = body;
    const { data } = payload;
    const { forceOverwrite, importSettings, importRepos, importReviewers, importBots } = options;

    const results = {
      settings: { updated: 0 },
      repositories: { added: 0, updated: 0, skipped: 0 },
      reviewers: { added: 0, updated: 0, skipped: 0 },
      botMappings: { added: 0, updated: 0, skipped: 0 },
    };

    await prisma.$transaction(async (tx) => {
      // 1. Settings
      if (importSettings && data.settings) {
         const { id, updatedAt, githubToken, julesApiKey, webhookSecret, ...safeSettings } = data.settings;
         await tx.settings.upsert({
           where: { id: 1 },
           update: safeSettings,
           create: { id: 1, ...safeSettings }
         });
         results.settings.updated = 1;
      }

      // 2. Reviewers
      if (importReviewers && Array.isArray(data.reviewers)) {
        for (const reviewer of data.reviewers) {
          if (typeof reviewer.noActionRegex === 'string' && reviewer.noActionRegex !== '') {
            try { new RegExp(reviewer.noActionRegex, 'i'); }
            catch { results.reviewers.skipped++; continue; }
          }
          const existing = await tx.targetReviewer.findUnique({ where: { username: reviewer.username } });
          if (existing) {
            if (forceOverwrite) {
               await tx.targetReviewer.update({
                 where: { username: reviewer.username },
                 data: { isActive: reviewer.isActive, noActionRegex: reviewer.noActionRegex }
               });
               results.reviewers.updated++;
            } else {
               results.reviewers.skipped++;
            }
          } else {
             await tx.targetReviewer.create({
               data: { username: reviewer.username, isActive: reviewer.isActive, noActionRegex: reviewer.noActionRegex }
             });
             results.reviewers.added++;
          }
        }
      }

      // 3. Bot Mappings
      if (importBots && Array.isArray(data.botMappings)) {
        for (const bot of data.botMappings) {
          const existing = await tx.botAgentMapping.findUnique({ where: { botSource: bot.botSource } });
          if (existing) {
            if (forceOverwrite) {
               await tx.botAgentMapping.update({
                 where: { botSource: bot.botSource },
                 data: { agentName: bot.agentName, role: bot.role }
               });
               results.botMappings.updated++;
            } else {
               results.botMappings.skipped++;
            }
          } else {
             await tx.botAgentMapping.create({
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

            // Whitelist fields to avoid throwing on unknown JSON props
            const safeRepoData = {
              owner: repoData.owner,
              name: repoData.name,
              groupName: repoData.groupName,
              isActive: repoData.isActive,
              autoMergeEnabled: repoData.autoMergeEnabled,
              requiredApprovals: repoData.requiredApprovals,
              requireCI: repoData.requireCI,
              mergeStrategy: repoData.mergeStrategy,
              taskSourceType: repoData.taskSourceType,
              taskSourcePath: repoData.taskSourcePath,
              maxConcurrentTasks: repoData.maxConcurrentTasks,
              julesPromptTemplate: repoData.julesPromptTemplate,
              julesChatForwardMode: repoData.julesChatForwardMode,
              julesChatForwardDelay: repoData.julesChatForwardDelay,
              aiSystemPrompt: repoData.aiSystemPrompt,
              commentTemplate: repoData.commentTemplate,
              postAggregatedComments: repoData.postAggregatedComments,
              batchDelay: repoData.batchDelay,
              branchWhitelist: repoData.branchWhitelist,
              branchBlacklist: repoData.branchBlacklist,
              includeCheckRuns: repoData.includeCheckRuns,
              aiBotUsernames: repoData.aiBotUsernames,
              requiredBots: repoData.requiredBots,
              regressionDetection: repoData.regressionDetection,
              regressionMatchMode: repoData.regressionMatchMode,
              infiniteLoopThreshold: repoData.infiniteLoopThreshold,
              maxDiffLines: repoData.maxDiffLines,
              complexityWeights: repoData.complexityWeights
            };

            const nestedWrites = {
               ...(promptTemplates && promptTemplates.length > 0 ? {
                  promptTemplates: {
                     create: promptTemplates.map((pt: any) => ({ name: pt.name, template: pt.template, systemPrompt: pt.systemPrompt, isActive: pt.isActive }))
                  }
               } : {}),
               ...(prLabelRules && prLabelRules.length > 0 ? {
                  prLabelRules: {
                     create: prLabelRules.map((rl: any) => ({ event: rl.event, labelName: rl.labelName }))
                  }
               } : {})
            };

            const existing = await tx.repository.findUnique({ where: { owner_name: { owner: repo.owner, name: repo.name } } });

            if (existing) {
               if (forceOverwrite) {
                  // When overwriting, we first delete existing relations so we don't duplicate
                  if (promptTemplates && promptTemplates.length > 0) {
                      await tx.promptTemplate.deleteMany({ where: { repositoryId: existing.id } });
                  }
                  if (prLabelRules && prLabelRules.length > 0) {
                      await tx.pRLabelRule.deleteMany({ where: { repositoryId: existing.id } });
                  }
                  await tx.repository.update({
                    where: { id: existing.id },
                    data: { ...safeRepoData, ...nestedWrites }
                  });
                  results.repositories.updated++;
               } else {
                  results.repositories.skipped++;
               }
            } else {
               await tx.repository.create({
                 data: { ...safeRepoData, ...nestedWrites }
               });
               results.repositories.added++;
            }
         }
      }

      await tx.auditLog.create({ data: { action: 'IMPORT_CONFIG', entity: 'System', details: JSON.stringify(results) } });
    }); // End transaction

    return NextResponse.json({ success: true, results });


  } catch (error) {
    logger.error("Import failed:", error);
    return NextResponse.json({ error: 'Internal server error during import' }, { status: 500 });
  }
}
