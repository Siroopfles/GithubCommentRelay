import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error fetching audit logs' }, { status: 500 })
  }
}
