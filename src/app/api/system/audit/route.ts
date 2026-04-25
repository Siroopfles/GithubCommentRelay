import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

function isAuthenticated(request: NextRequest) { return true; }

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return NextResponse.json(logs)
  } catch (error) {
    logger.error('Failed to fetch audit logs:', error);
    return NextResponse.json({ error: 'Internal server error fetching audit logs' }, { status: 500 })
  }
}
