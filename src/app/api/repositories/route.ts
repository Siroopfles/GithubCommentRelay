import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const repos = await prisma.repository.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(repos)
}

export async function POST(request: Request) {
  const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate } = await request.json()

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

  const validTaskSourceType = ['none', 'local_folder', 'github_issues'].includes(taskSourceType) ? taskSourceType : 'none';
  const validJulesChatForwardMode = ['off', 'always', 'failsafe'].includes(julesChatForwardMode) ? julesChatForwardMode : 'off';

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
        julesPromptTemplate: julesPromptTemplate || null,
        julesChatForwardMode: validJulesChatForwardMode,
        julesChatForwardDelay: parsedDelay,
        aiSystemPrompt: (typeof aiSystemPrompt === "string" && aiSystemPrompt !== "") ? aiSystemPrompt : null,
        commentTemplate: (typeof commentTemplate === "string" && commentTemplate !== "") ? commentTemplate : null
      }
    })
    return NextResponse.json(repo)
  } catch (error) {
    return NextResponse.json({ error: 'Repository already exists or validation failed' }, { status: 400 })
  }
}
