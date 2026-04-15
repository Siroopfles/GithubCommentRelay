import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.autoMergeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to latest 100 logs
    })
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error fetching logs' }, { status: 500 })
  }
}
