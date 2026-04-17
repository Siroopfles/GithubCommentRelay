import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const reviewers = await prisma.targetReviewer.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(reviewers)
}

export async function POST(request: Request) {
  const { username, noActionRegex } = await request.json()
  try {
    const reviewer = await prisma.targetReviewer.create({
      data: { username, noActionRegex }
    })
    return NextResponse.json(reviewer)
  } catch (error) {
    return NextResponse.json({ error: 'Reviewer already exists' }, { status: 400 })
  }
}
