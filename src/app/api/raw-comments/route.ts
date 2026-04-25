import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit')) || 50

  try {
    const comments = await prisma.processedComment.findMany({
      orderBy: { postedAt: 'desc' },
      take: limit
    })
    return NextResponse.json(comments)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error fetching comments' }, { status: 500 })
  }
}
