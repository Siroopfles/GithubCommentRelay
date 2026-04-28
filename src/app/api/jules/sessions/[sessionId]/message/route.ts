import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMessage } from '@/lib/julesApi'

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  try {
    const json = await request.json()
    const { message } = json

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const settings = await prisma.settings.findFirst()
    if (!settings?.julesApiKey) {
      return NextResponse.json({ error: 'Jules API key is not configured' }, { status: 400 })
    }

    const response = await sendMessage(settings.julesApiKey, sessionId, message)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Failed to send message:', error)
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 })
  }
}
