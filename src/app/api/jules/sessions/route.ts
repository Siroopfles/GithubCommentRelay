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
        julesSessionId: session.name,
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
