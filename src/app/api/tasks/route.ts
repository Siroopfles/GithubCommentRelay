import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const repositoryId = searchParams.get('repositoryId')

  if (!repositoryId) {
    return NextResponse.json({ error: 'repositoryId is required' }, { status: 400 })
  }

  const tasks = await prisma.task.findMany({
    where: { repositoryId },
    orderBy: { priority: 'desc' }
  })
  return NextResponse.json(tasks)
}

export async function POST(request: Request) {
  const json = await request.json()
  const { repositoryId, title, body, status, priority, contextFiles } = json

  if (!repositoryId || !title) {
    return NextResponse.json({ error: 'repositoryId and title are required' }, { status: 400 })
  }

  let parsedPriority = 0
  if (priority !== undefined) {
    parsedPriority = parseInt(priority, 10)
    if (isNaN(parsedPriority)) parsedPriority = 0
  }

  try {
    const task = await prisma.task.create({
      data: {
        repositoryId,
        title,
        body: body || null,
        status: status || 'backlog',
        source: 'manual',
        priority: parsedPriority,
        contextFiles: typeof contextFiles === 'string' ? contextFiles : JSON.stringify(contextFiles || []),
      }
    })
    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
