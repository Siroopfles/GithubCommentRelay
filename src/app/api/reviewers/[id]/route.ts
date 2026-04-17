import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const json = await request.json()

    const updateData: any = {};
    if (json.isActive !== undefined) {
      if (typeof json.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
      }
      updateData.isActive = json.isActive;
    }
    if (json.noActionRegex !== undefined) {
      let noActionRegex = json.noActionRegex;
      if (noActionRegex === '') noActionRegex = null;
      if (noActionRegex !== null) {
        try {
          new RegExp(noActionRegex);
        } catch (e) {
          return NextResponse.json({ error: 'Invalid noActionRegex' }, { status: 400 });
        }
      }
      updateData.noActionRegex = noActionRegex;
    }
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
