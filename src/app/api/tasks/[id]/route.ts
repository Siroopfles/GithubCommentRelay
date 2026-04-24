import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const json = await request.json()
    const updateData: any = {}

if (json.dependsOnId !== undefined) {
      const dependsOnId = json.dependsOnId === '' ? null : json.dependsOnId

      if (dependsOnId === id) {
        return NextResponse.json({ error: 'Task cannot depend on itself' }, { status: 400 })
      }

      if (dependsOnId) {
        const task = await prisma.task.findUnique({
          where: { id },
          select: { repositoryId: true },
        })

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        const dependency = await prisma.task.findFirst({
          where: { id: dependsOnId, repositoryId: task.repositoryId },
          select: { id: true },
        })

        if (!dependency) {
          return NextResponse.json({ error: 'Dependency task does not exist in this repository' }, { status: 400 })
        }

        // Cycle detection
        let cursor = dependsOnId;
        const seen = new Set<string>();
        while (cursor) {
          if (cursor === id) {
            return NextResponse.json({ error: 'Dependency cycle detected' }, { status: 400 });
          }
          if (seen.has(cursor)) break;
          seen.add(cursor);
          const next = await prisma.task.findUnique({
            where: { id: cursor },
            select: { dependsOnId: true }
          });
          cursor = next?.dependsOnId || null;
        }
      }

      updateData.dependsOnId = dependsOnId
    }

    if (json.status !== undefined) {
      if (!['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'].includes(json.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      if (['todo', 'in_progress', 'in_review', 'done'].includes(json.status)) {
         const task = await prisma.task.findUnique({
           where: { id },
           select: { dependsOnId: true }
         });
         const effectiveDependsOnId = json.dependsOnId !== undefined ? (json.dependsOnId === '' ? null : json.dependsOnId) : task?.dependsOnId;

         if (effectiveDependsOnId) {
             const dependency = await prisma.task.findUnique({
                 where: { id: effectiveDependsOnId },
                 select: { status: true }
             });
             if (!dependency || dependency.status !== 'done') {
                 return NextResponse.json({ error: 'Cannot move to this status because dependency is missing or not done' }, { status: 400 });
             }
         }
      }

      updateData.status = json.status
    }
    if (json.priority !== undefined) {
      const p = parseInt(json.priority, 10)
      if (!isNaN(p)) updateData.priority = p
    }
    if (json.title !== undefined) {
      if (typeof json.title !== 'string' || json.title.trim() === '') {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      }
      updateData.title = json.title
    }
    if (json.body !== undefined) updateData.body = json.body
    if (json.contextFiles !== undefined) {
        updateData.contextFiles = typeof json.contextFiles === 'string' ? json.contextFiles : JSON.stringify(json.contextFiles)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(task)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await prisma.task.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
