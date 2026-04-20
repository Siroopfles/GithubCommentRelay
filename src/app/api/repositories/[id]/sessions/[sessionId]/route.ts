import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string, sessionId: string }> }) {
  const { id, sessionId } = await params;

  try {
    const json = await request.json();

    if (json.includeCheckRuns !== undefined) {
      if (typeof json.includeCheckRuns !== 'boolean') {
        return NextResponse.json({ error: 'includeCheckRuns must be a boolean' }, { status: 400 });
      }

      const repo = await prisma.repository.findUnique({
        where: { id },
        select: { owner: true, name: true },
      });
      if (!repo) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }

      const result = await prisma.batchSession.updateMany({
        where: { id: sessionId, repoOwner: repo.owner, repoName: repo.name },
        data: { includeCheckRuns: json.includeCheckRuns }
      });
      if (result.count === 0) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
