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
      if (typeof json.autoMergeEnabled !== 'boolean') {
        return NextResponse.json({ error: 'autoMergeEnabled must be a boolean' }, { status: 400 })
      }
      updateData.autoMergeEnabled = json.autoMergeEnabled
    }

    if (json.requiredApprovals !== undefined) {
      const approvals = parseInt(json.requiredApprovals, 10)
      if (isNaN(approvals) || approvals < 0) {
        return NextResponse.json({ error: 'requiredApprovals must be a non-negative number' }, { status: 400 })
      }
      updateData.requiredApprovals = approvals
    }

    if (json.requireCI !== undefined) {
      if (typeof json.requireCI !== 'boolean') {
        return NextResponse.json({ error: 'requireCI must be a boolean' }, { status: 400 })
      }
      updateData.requireCI = json.requireCI
    }

    if (json.taskSourceType !== undefined) {
      if (!["none", "local_folder", "github_issues"].includes(json.taskSourceType)) {
        return NextResponse.json({ error: "Invalid taskSourceType" }, { status: 400 })
      }
      updateData.taskSourceType = json.taskSourceType
    }
    if (json.taskSourcePath !== undefined) {
      updateData.taskSourcePath = json.taskSourcePath === "" ? null : json.taskSourcePath
    }
    if (json.julesPromptTemplate !== undefined) {
      updateData.julesPromptTemplate = json.julesPromptTemplate === "" ? null : json.julesPromptTemplate
    }
    if (json.julesChatForwardMode !== undefined) {
      if (!["off", "always", "failsafe"].includes(json.julesChatForwardMode)) {
        return NextResponse.json({ error: "Invalid julesChatForwardMode" }, { status: 400 })
      }
      updateData.julesChatForwardMode = json.julesChatForwardMode
    }
    if (json.julesChatForwardDelay !== undefined) {
      const delay = parseInt(json.julesChatForwardDelay, 10)
      if (isNaN(delay) || delay < 0) {
        return NextResponse.json({ error: "julesChatForwardDelay must be a non-negative number" }, { status: 400 })
      }
      updateData.julesChatForwardDelay = delay
    }

    if (json.aiSystemPrompt !== undefined) {
      if (json.aiSystemPrompt !== null && typeof json.aiSystemPrompt !== "string") {
        return NextResponse.json({ error: "aiSystemPrompt must be a string or null" }, { status: 400 })
      }
      updateData.aiSystemPrompt = json.aiSystemPrompt === "" ? null : json.aiSystemPrompt
    }

    if (json.commentTemplate !== undefined) {
      if (json.commentTemplate !== null && typeof json.commentTemplate !== "string") {
        return NextResponse.json({ error: "commentTemplate must be a string or null" }, { status: 400 })
      }
      updateData.commentTemplate = json.commentTemplate === "" ? null : json.commentTemplate
    }

    if (json.mergeStrategy !== undefined) {
      if (!['merge', 'squash', 'rebase'].includes(json.mergeStrategy)) {
        return NextResponse.json({ error: 'Invalid mergeStrategy' }, { status: 400 })
      }
      updateData.mergeStrategy = json.mergeStrategy
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 })
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
