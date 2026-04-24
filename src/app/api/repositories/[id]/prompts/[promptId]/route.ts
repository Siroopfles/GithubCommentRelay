import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string, promptId: string }> }) {
  const { id, promptId } = await params;
  try {
    const json = await request.json();
    const updateData: any = {};

    if (json.name !== undefined) {
      if (typeof json.name !== 'string' || json.name.trim() === '') {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
      }
      updateData.name = json.name;
    }
    if (json.systemPrompt !== undefined) {
      if (json.systemPrompt !== null && typeof json.systemPrompt !== 'string') {
        return NextResponse.json({ error: 'systemPrompt must be a string or null' }, { status: 400 });
      }
      updateData.systemPrompt = json.systemPrompt;
    }
    if (json.template !== undefined) {
      if (typeof json.template !== 'string') {
        return NextResponse.json({ error: 'template must be a string' }, { status: 400 });
      }
      updateData.template = json.template;
    }
    if (json.isActive !== undefined) {
      if (typeof json.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
      }
      updateData.isActive = json.isActive;
    }

    const updated = await prisma.promptTemplate.update({
      where: { id: promptId, repositoryId: id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    console.error('Prompt update error', error);
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
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    console.error('Prompt delete error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
