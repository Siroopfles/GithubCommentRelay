import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const json = await request.json();
    const updateData: any = {};

    if (json.isHighPriority !== undefined) updateData.isHighPriority = json.isHighPriority;
    if (json.isPaused !== undefined) {
      if (typeof json.isPaused !== 'boolean') {
        return NextResponse.json({ error: 'isPaused must be a boolean' }, { status: 400 });
      }
      updateData.isPaused = json.isPaused;
      if (json.isPaused === false) updateData.loopCount = 0;

      // If pausing, try to send a stop message via GitHub comment as a fallback
      if (json.isPaused === true) {
        try {
           const session = await prisma.batchSession.findUnique({ where: { id } });
           const settings = await prisma.settings.findUnique({ where: { id: 1 } });
           const repoConfig = await prisma.repository.findUnique({ where: { owner_name: { owner: session?.repoOwner || '', name: session?.repoName || '' } } });

           let token = repoConfig?.githubToken || settings?.githubToken;
           if (session && token) {
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
                    status: 'FAILED',
                    message: 'Admin manually paused AI processing.'
                 }
              });
           }
        } catch (e) {
           console.error("Failed to post STOP comment to GitHub:", e);
        }
      }
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
