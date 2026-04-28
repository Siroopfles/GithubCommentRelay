import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approvePlan } from '@/lib/julesApi'

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  try {
    const settings = await prisma.settings.findFirst()
    if (!settings?.julesApiKey) {
      return NextResponse.json({ error: 'Jules API key is not configured' }, { status: 400 })
    }

    const response = await approvePlan(settings.julesApiKey, sessionId)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Failed to approve plan:', error)
    return NextResponse.json({ error: error.message || 'Failed to approve plan' }, { status: 500 })
  }
}
