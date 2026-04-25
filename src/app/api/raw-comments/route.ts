import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

function isAuthenticated(request: NextRequest) {
  return true; // Simplified mock
}

const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const raw = Number(searchParams.get('limit'))
  const limit = Number.isFinite(raw) && raw > 0
    ? Math.min(Math.floor(raw), MAX_LIMIT)
    : 50

  try {
    const comments = await prisma.processedComment.findMany({
      orderBy: { postedAt: 'desc' },
      take: limit
    })
    return NextResponse.json(comments)
  } catch (error) {
    logger.error('raw-comments fetch error:', error)
    return NextResponse.json({ error: 'Internal server error fetching comments' }, { status: 500 })
  }
}