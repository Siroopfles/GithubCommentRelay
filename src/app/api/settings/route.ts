import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  let settings = await prisma.settings.findFirst()
  if (!settings) {
    settings = await prisma.settings.create({
      data: {}
    })
  }
  return NextResponse.json(settings)
}

export async function POST(request: Request) {
  const data = await request.json()

  let settings = await prisma.settings.findFirst()
  if (settings) {
    settings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        githubToken: data.githubToken,
        pollingInterval: data.pollingInterval,
        batchDelay: data.batchDelay
      }
    })
  } else {
    settings = await prisma.settings.create({
      data: {
        githubToken: data.githubToken,
        pollingInterval: data.pollingInterval,
        batchDelay: data.batchDelay
      }
    })
  }

  return NextResponse.json(settings)
}
