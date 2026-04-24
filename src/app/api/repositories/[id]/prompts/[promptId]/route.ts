import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string, promptId: string }> }) {
  const { id, promptId } = await params;
  try {
    const json = await request.json();
    const updateData: any = {};

    if (json.name !== undefined) updateData.name = json.name;
    if (json.systemPrompt !== undefined) updateData.systemPrompt = json.systemPrompt;
    if (json.template !== undefined) updateData.template = json.template;
    if (json.isActive !== undefined) updateData.isActive = json.isActive;

    const updated = await prisma.promptTemplate.update({
      where: { id: promptId, repositoryId: id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, promptId: string }> }) {
  const { id, promptId } = await params;
  try {
    await prisma.promptTemplate.delete({
      where: { id: promptId, repositoryId: id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
