import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const json = await request.json();
    const updateData: any = {};

    if (json.isHighPriority !== undefined) updateData.isHighPriority = json.isHighPriority;
    if (json.manualPrompt !== undefined) updateData.manualPrompt = json.manualPrompt;

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
