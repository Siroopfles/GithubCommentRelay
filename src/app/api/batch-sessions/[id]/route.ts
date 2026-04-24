import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO(auth): replace with next-auth session check or signed admin cookie.
function isAuthenticated(request: NextRequest) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false; // fail closed when not configured
  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  // constant-time compare recommended in real impl
  return provided.length > 0 && provided === expected;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const json = await request.json();
    const updateData: any = {};

    if (json.isHighPriority !== undefined) updateData.isHighPriority = json.isHighPriority;
    let shouldNotifyPause = false;
    if (json.isPaused !== undefined) {
      if (typeof json.isPaused !== 'boolean') {
        return NextResponse.json({ error: 'isPaused must be a boolean' }, { status: 400 });
      }
      updateData.isPaused = json.isPaused;
      if (json.isPaused === false) {
        updateData.loopCount = 0;
        updateData.hasConflict = false; // Reset conflict flag on resume
      }

      // handled atomically below via updateMany
    }
    if (json.manualPrompt !== undefined) {
      if (typeof json.manualPrompt === 'string' && json.manualPrompt.length > 10000) {
        return NextResponse.json({ error: 'Manual prompt is too long (limit: 10,000 characters)' }, { status: 400 });
      }
      updateData.manualPrompt = json.manualPrompt;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    let session;
    if (json.isPaused === true) {
      const { isPaused: _ignored, ...rest } = updateData;
      // Use transaction to ensure both the atomic pause transition and the other field updates
      // either succeed together or fail together, preventing partial states.
      const result = await prisma.$transaction(async (tx) => {
        const res = await tx.batchSession.updateMany({
          where: { id, isPaused: false },
          data: { isPaused: true },
        });

        let sess;
        if (Object.keys(rest).length > 0) {
          sess = await tx.batchSession.update({ where: { id }, data: rest });
        } else {
          sess = await tx.batchSession.findUnique({ where: { id } });
        }

        return { count: res.count, session: sess };
      });

      shouldNotifyPause = result.count === 1;
      session = result.session;

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    } else {
      session = await prisma.batchSession.update({ where: { id }, data: updateData });
    }

    if (shouldNotifyPause) {
        try {
           const [settings, repoConfig] = await Promise.all([
              prisma.settings.findUnique({ where: { id: 1 } }),
              prisma.repository.findUnique({ where: { owner_name: { owner: session.repoOwner, name: session.repoName } } })
           ]);

           let token = repoConfig?.githubToken || settings?.githubToken;
           if (token) {
              const { Octokit } = await import('octokit');
              const octokit = new Octokit({ auth: token });
              await octokit.rest.issues.createComment({
                 owner: session.repoOwner,
                 repo: session.repoName,
                 issue_number: session.prNumber,
                 body: "🛑 **ADMIN OVERRIDE: Agent, STOP.**\n\nA human has intervened and paused automated processing for this Pull Request."
              });

              // Also record in logs
              await prisma.autoMergeLog.create({
                 data: {
                    repoOwner: session.repoOwner,
                    repoName: session.repoName,
                    prNumber: session.prNumber,
                    status: 'PAUSED', // Custom non-FAILED status
                    message: 'Admin manually paused AI processing.'
                 }
              });
           }
        } catch (e) {
           console.error("Failed to post STOP comment to GitHub:", e);
        }
    }

    return NextResponse.json(session);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
