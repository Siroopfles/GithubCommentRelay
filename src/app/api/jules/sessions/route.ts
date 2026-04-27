import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/julesApi'

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const { taskId, prompt, startingBranch } = json

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { repository: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.julesSessionId && !['COMPLETED', 'FAILED'].includes(task.julesSessionState ?? '')) {
      if (!json.force) {
        return NextResponse.json(
          { error: 'Task already has an active Jules session', sessionId: task.julesSessionId },
          { status: 409 }
        )
      }
    }

    const settings = await prisma.settings.findFirst()
    if (!settings?.julesApiKey) {
      return NextResponse.json({ error: 'Jules API key is not configured' }, { status: 400 })
    }

    const source = `sources/github.com/${task.repository.owner}/${task.repository.name}`
    const session = await createSession(settings.julesApiKey, prompt || task.title, source, startingBranch || 'main')

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        julesSessionId: session.name ? session.name.split('/').pop() : null,
        julesSessionState: session.state || 'QUEUED',
        julesSessionUrl: session.url || null,
        julesSessionCreatedAt: new Date(),
        status: 'in_progress'
      }
    })

    return NextResponse.json({ session, task: updatedTask })
  } catch (error: any) {
    console.error('Failed to create Jules session:', error)
    return NextResponse.json({ error: error.message || 'Failed to create Jules session' }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Only support fetching active sessions for now
    if (status !== 'active') {
       return NextResponse.json({ error: 'Unsupported status filter' }, { status: 400 })
    }

    const tasks = await prisma.task.findMany({
      where: {
        julesSessionId: { not: null },
        OR: [
          { julesSessionState: null },
          { julesSessionState: { notIn: ['COMPLETED', 'FAILED'] } }
        ]
      },
      include: {
        repository: true
      }
    })

    const formattedTasks = tasks.map(t => ({
       ...t,
       repoOwner: t.repository.owner,
       repoName: t.repository.name
    }));

    return NextResponse.json(formattedTasks)
  } catch (error: any) {
    console.error('Failed to list Jules sessions:', error)
    return NextResponse.json({ error: error.message || 'Failed to list Jules sessions' }, { status: 500 })
  }
}
