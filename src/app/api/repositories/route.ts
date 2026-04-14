import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const repos = await prisma.repository.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(repos)
}

export async function POST(request: Request) {
  const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy } = await request.json()
  try {
    const repo = await prisma.repository.create({
      data: {
        owner,
        name,
        autoMergeEnabled: autoMergeEnabled || false,
        requiredApprovals: requiredApprovals !== undefined ? Math.max(0, parseInt(requiredApprovals, 10) || 0) : 1,
        requireCI: requireCI !== undefined ? requireCI : true,
        mergeStrategy: mergeStrategy || 'merge'
      }
    })
    return NextResponse.json(repo)
  } catch (error) {
    return NextResponse.json({ error: 'Repository already exists or validation failed' }, { status: 400 })
  }
}
