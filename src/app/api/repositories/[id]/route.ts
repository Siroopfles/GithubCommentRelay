import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const json = await request.json()
    const updateData: any = {}

    if (json.isActive !== undefined) {
      if (typeof json.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
      }
      updateData.isActive = json.isActive
    }

    if (json.autoMergeEnabled !== undefined) {
      if (typeof json.autoMergeEnabled === 'boolean') updateData.autoMergeEnabled = json.autoMergeEnabled
    }

    if (json.requiredApprovals !== undefined) {
      const approvals = parseInt(json.requiredApprovals, 10)
      if (isNaN(approvals) || approvals < 0) {
        return NextResponse.json({ error: 'requiredApprovals must be a positive number' }, { status: 400 })
      }
      updateData.requiredApprovals = approvals
    }

    if (json.requireCI !== undefined) {
      if (typeof json.requireCI === 'boolean') updateData.requireCI = json.requireCI
    }

    if (json.mergeStrategy !== undefined) {
      if (!['merge', 'squash', 'rebase'].includes(json.mergeStrategy)) {
        return NextResponse.json({ error: 'Invalid mergeStrategy' }, { status: 400 })
      }
      updateData.mergeStrategy = json.mergeStrategy
    }

    const repo = await prisma.repository.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(repo)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await prisma.repository.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
