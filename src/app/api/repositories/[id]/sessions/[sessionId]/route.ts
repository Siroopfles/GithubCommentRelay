import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string, sessionId: string }> }) {
  const { sessionId } = await params;

  try {
    const json = await request.json();

    if (json.includeCheckRuns !== undefined) {
      await prisma.batchSession.update({
        where: { id: sessionId },
        data: { includeCheckRuns: json.includeCheckRuns }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
