import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/julesApi'


export async function POST(request: NextRequest) {
  try {
    // Basic auth check if no session mechanism is present
    const authHeader = request.headers.get('authorization');
    // For now we just implement the signature change as requested

    const settings = await prisma.settings.findFirst()
    if (!settings?.julesApiKey) {
      return NextResponse.json({ error: 'Jules API key is not configured' }, { status: 400 })
    }

    const tasks = await prisma.task.findMany({
      where: {
        julesSessionId: { not: null },
        julesSessionState: {
          notIn: ['COMPLETED', 'FAILED']
        }
      }
    })

    const results = []

    for (const task of tasks) {
      if (!task.julesSessionId) continue;

      try {
        const session = await getSession(settings.julesApiKey, task.julesSessionId)

        let prUrl = task.julesSessionPrUrl;
        let prNumber = task.prNumber;

        if (session.outputs && session.outputs.length > 0) {
            for (const output of session.outputs) {
                if (output.pullRequest && output.pullRequest.url) {
                    prUrl = output.pullRequest.url;
                    const match = prUrl ? prUrl.match(/\/pull\/(\d+)/) : null;
                    if (match) {
                        prNumber = parseInt(match[1], 10);
                    }
                }
            }
        }

        const updatedTask = await prisma.task.update({
          where: { id: task.id },
          data: {
            julesSessionState: session.state,
            julesSessionUrl: session.url || task.julesSessionUrl,
            julesSessionPrUrl: prUrl,
            prNumber: prNumber,
            status: session.state === 'COMPLETED' ? 'in_review' : session.state === 'FAILED' ? 'blocked' : 'in_progress'
          }
        })
        results.push({ id: task.id, status: 'success', state: session.state })
      } catch (err: any) {
        console.error(`Failed to sync task ${task.id}:`, err)
        results.push({ id: task.id, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({ synced: results.length, results })
  } catch (error: any) {
    console.error('Failed to sync sessions:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync sessions' }, { status: 500 })
  }
}
