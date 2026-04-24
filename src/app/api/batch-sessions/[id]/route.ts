import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const json = await request.json();
    const updateData: any = {};

    if (json.isHighPriority !== undefined) updateData.isHighPriority = json.isHighPriority;
    if (json.manualPrompt !== undefined) {
      if (typeof json.manualPrompt === 'string' && json.manualPrompt.length > 10000) {
        return NextResponse.json({ error: 'Manual prompt is too long (limit: 10,000 characters)' }, { status: 400 });
      }
      updateData.manualPrompt = json.manualPrompt;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const session = await prisma.batchSession.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(session);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
