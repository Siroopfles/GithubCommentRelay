import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, listActivities } from '@/lib/julesApi'

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  try {
    const settings = await prisma.settings.findFirst()
    if (!settings?.julesApiKey) {
      return NextResponse.json({ error: 'Jules API key is not configured' }, { status: 400 })
    }

    const [session, activities] = await Promise.all([
      getSession(settings.julesApiKey, sessionId),
      listActivities(settings.julesApiKey, sessionId)
    ])

    return NextResponse.json({ session, activities })
  } catch (error: any) {
    console.error('Failed to get Jules session:', error)
    return NextResponse.json({ error: error.message || 'Failed to get Jules session' }, { status: 500 })
  }
}
