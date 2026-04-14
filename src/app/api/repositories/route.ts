import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const repos = await prisma.repository.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(repos)
}

export async function POST(request: Request) {
  const { owner, name } = await request.json()
  try {
    const repo = await prisma.repository.create({
      data: { owner, name }
    })
    return NextResponse.json(repo)
  } catch (error) {
    return NextResponse.json({ error: 'Repository already exists' }, { status: 400 })
  }
}
