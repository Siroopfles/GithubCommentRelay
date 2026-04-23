import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const repositoryId = searchParams.get('repositoryId')

  if (!repositoryId) {
    return NextResponse.json({ error: 'repositoryId is required' }, { status: 400 })
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { repositoryId },
      orderBy: { priority: 'desc' }
    })
    return NextResponse.json(tasks)
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const json = await request.json()
  const { repositoryId, title, body, status, priority, contextFiles, dependsOnId } = json

  if (!repositoryId || !title) {
    return NextResponse.json({ error: 'repositoryId and title are required' }, { status: 400 })
  }

  let parsedPriority = 0
  if (priority !== undefined) {
    parsedPriority = parseInt(priority, 10)
    if (isNaN(parsedPriority)) parsedPriority = 0
  }

  try {
    if (dependsOnId) {
      const dependency = await prisma.task.findFirst({
        where: { id: dependsOnId, repositoryId },
        select: { id: true },
      })

      if (!dependency) {
        return NextResponse.json({ error: 'Dependency task does not exist in this repository' }, { status: 400 })
      }
    }

    const task = await prisma.task.create({
      data: {
        repositoryId,
        title,
        body: body || null,
        status: ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'].includes(status) ? status : 'backlog',
        source: 'manual',
        priority: parsedPriority,
        contextFiles: contextFiles ? (typeof contextFiles === 'string' ? contextFiles : JSON.stringify(contextFiles)) : null,
        dependsOnId: dependsOnId || null,
      }
    })
    return NextResponse.json(task)
  } catch (error: any) {
    if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Repository does not exist' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
