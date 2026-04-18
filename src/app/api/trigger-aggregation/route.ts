import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Set firstSeenAt to 0 (Jan 1, 1970) so the worker immediately picks it up
    const updatedSession = await prisma.batchSession.update({
      where: { id: sessionId },
      data: {
        firstSeenAt: new Date(0)
      }
    })

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error) {
    console.error('Failed to trigger aggregation:', error)
    return NextResponse.json({ error: 'Failed to trigger aggregation' }, { status: 500 })
  }
}
