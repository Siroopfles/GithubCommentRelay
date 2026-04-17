import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const json = await request.json()

    const updateData: any = {};
    if (typeof json.isActive === 'boolean') updateData.isActive = json.isActive;
    if (json.noActionRegex !== undefined) updateData.noActionRegex = json.noActionRegex;
    const reviewer = await prisma.targetReviewer.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(reviewer)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Reviewer not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await prisma.targetReviewer.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Reviewer not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
