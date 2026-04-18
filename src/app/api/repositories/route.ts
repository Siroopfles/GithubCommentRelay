import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const repos = await prisma.repository.findMany({ orderBy: { createdAt: 'desc' } })
  const safeRepos = repos.map(repo => {
    const { githubToken, ...rest } = repo;
    return { ...rest, hasGithubToken: !!githubToken };
  });
  return NextResponse.json(safeRepos)
}

export async function POST(request: Request) {
  const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, maxConcurrentTasks, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate, postAggregatedComments, batchDelay, branchWhitelist, branchBlacklist, githubToken, requiredBots } = await request.json()

  // Validate requiredApprovals
  let parsedApprovals = 1;
  if (requiredApprovals !== undefined) {
    parsedApprovals = parseInt(requiredApprovals, 10);
    if (isNaN(parsedApprovals) || parsedApprovals < 0) {
      return NextResponse.json({ error: 'requiredApprovals must be a non-negative number' }, { status: 400 });
    }
  }

  let parsedDelay = 5;
  if (julesChatForwardDelay !== undefined) {
    const d = parseInt(julesChatForwardDelay, 10);
    if (!isNaN(d) && d >= 0) {
      parsedDelay = d;
    }
  }

  if (postAggregatedComments !== undefined && typeof postAggregatedComments !== 'boolean') {
    return NextResponse.json({ error: 'postAggregatedComments must be a boolean' }, { status: 400 })
  }
  const validTaskSourceType = ['none', 'local_folder', 'github_issues'].includes(taskSourceType) ? taskSourceType : 'none';
  const validJulesChatForwardMode = ['off', 'always', 'failsafe'].includes(julesChatForwardMode) ? julesChatForwardMode : 'off';

  let parsedBatchDelay: number | null = null;
  if (batchDelay !== undefined && batchDelay !== null && batchDelay !== '') {
    const d = parseInt(batchDelay, 10);
    if (isNaN(d) || d < 0) {
      return NextResponse.json({ error: 'batchDelay must be a non-negative integer or null' }, { status: 400 });
    }
    parsedBatchDelay = d;
  }


  try {
    const repo = await prisma.repository.create({
      data: {
        owner,
        name,
        autoMergeEnabled: autoMergeEnabled || false,
        requiredApprovals: parsedApprovals,
        requireCI: requireCI !== undefined ? requireCI : true,
        mergeStrategy: ['merge', 'squash', 'rebase'].includes(mergeStrategy) ? mergeStrategy : 'merge',
        taskSourceType: validTaskSourceType,
        taskSourcePath: taskSourcePath || null,
        maxConcurrentTasks: typeof maxConcurrentTasks === 'number' ? maxConcurrentTasks : 3,
        julesPromptTemplate: julesPromptTemplate || null,
        julesChatForwardMode: validJulesChatForwardMode,
        julesChatForwardDelay: parsedDelay,
        aiSystemPrompt: (typeof aiSystemPrompt === "string" && aiSystemPrompt !== "") ? aiSystemPrompt : null,
        commentTemplate: (typeof commentTemplate === "string" && commentTemplate !== "") ? commentTemplate : null,
        postAggregatedComments: postAggregatedComments !== undefined ? postAggregatedComments : true,
        batchDelay: parsedBatchDelay,
        branchWhitelist: typeof branchWhitelist === "string" && branchWhitelist !== "" ? branchWhitelist : null,
        branchBlacklist: typeof branchBlacklist === "string" && branchBlacklist !== "" ? branchBlacklist : null,
        githubToken: typeof githubToken === "string" && githubToken !== "" ? githubToken : null,
        requiredBots: typeof requiredBots === "string" && requiredBots !== "" ? requiredBots : null
      }
    })
    const { githubToken: _, ...safeRepo } = repo;
    return NextResponse.json({ ...safeRepo, hasGithubToken: !!repo.githubToken })
  } catch (error) {
    return NextResponse.json({ error: 'Repository already exists or validation failed' }, { status: 400 })
  }
}
