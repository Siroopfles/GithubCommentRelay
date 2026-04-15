import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const repos = await prisma.repository.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(repos)
}

export async function POST(request: Request) {
  const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay } = await request.json()

  // Validate requiredApprovals
  let parsedApprovals = 1;
  if (requiredApprovals !== undefined) {
    parsedApprovals = parseInt(requiredApprovals, 10);
    if (isNaN(parsedApprovals) || parsedApprovals < 0) {
      return NextResponse.json({ error: 'requiredApprovals must be a non-negative number' }, { status: 400 });
    }
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
        taskSourceType: taskSourceType || 'none',
        taskSourcePath: taskSourcePath || null,
        julesPromptTemplate: julesPromptTemplate || null,
        julesChatForwardMode: julesChatForwardMode || 'off',
        julesChatForwardDelay: julesChatForwardDelay !== undefined ? parseInt(julesChatForwardDelay, 10) : 5
      }
    })
    return NextResponse.json(repo)
  } catch (error) {
    return NextResponse.json({ error: 'Repository already exists or validation failed' }, { status: 400 })
  }
}
