import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const reviewers = await prisma.targetReviewer.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(reviewers)
}

export async function POST(request: Request) {
  let { username, noActionRegex } = await request.json()

  if (noActionRegex === '') {
    noActionRegex = null;
  }

  if (noActionRegex) {
    try {
      new RegExp(noActionRegex);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid noActionRegex' }, { status: 400 });
    }
  }
  try {
    const reviewer = await prisma.targetReviewer.create({
      data: { username, noActionRegex }
    })
    return NextResponse.json(reviewer)
  } catch (error) {
    return NextResponse.json({ error: 'Reviewer already exists' }, { status: 400 })
  }
}
