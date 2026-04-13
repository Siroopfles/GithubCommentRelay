import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { isActive } = await request.json()
  const repo = await prisma.repository.update({
    where: { id },
    data: { isActive }
  })
  return NextResponse.json(repo)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.repository.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
