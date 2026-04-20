import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const session = await prisma.batchSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.isProcessed) {
      return NextResponse.json({ error: 'Session is already processed' }, { status: 409 })
    }

    if (session.isProcessing) {
      return NextResponse.json({ error: 'Session is currently processing' }, { status: 409 })
    }

    // Set forceProcess to true so the worker immediately picks it up
    const updatedSession = await prisma.batchSession.update({
      where: { id: sessionId },
      data: {
        forceProcess: true
      }
    })

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error) {
    logger.error('Failed to trigger aggregation:', error)
    return NextResponse.json({ error: 'Failed to trigger aggregation' }, { status: 500 })
  }
}
