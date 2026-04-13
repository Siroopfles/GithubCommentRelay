import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { isActive } = await request.json()
  const reviewer = await prisma.targetReviewer.update({
    where: { id },
    data: { isActive }
  })
  return NextResponse.json(reviewer)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.targetReviewer.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
