import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const rawBody = await request.text();

        if (settings?.webhookSecret) {
        if (!signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
        const expected = 'sha256=' + crypto.createHmac('sha256', settings.webhookSecret).update(rawBody).digest('hex');
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
             return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    }

    const event = request.headers.get('x-github-event');
    let body;
    try {
        body = JSON.parse(rawBody);
    } catch(e) {
        return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const repoOwner = body?.repository?.owner?.login;
    const repoName = body?.repository?.name;

    if (!repoOwner || !repoName) {
        return NextResponse.json({ success: true, message: 'Ignored event (missing repo info)' });
    }

    let prNumber;
    if (event === 'issue_comment' && body?.issue?.pull_request && body?.issue?.number) {
        prNumber = body.issue.number;
    } else if ((event === 'pull_request_review_comment' || event === 'pull_request_review') && body?.pull_request?.number) {
        prNumber = body.pull_request.number;
    } else {
        return NextResponse.json({ success: true, message: 'Ignored event' });
    }

    if ((event as string) !== 'pull_request') {
        await prisma.webhookSignal.upsert({
        where: {
            repoOwner_repoName_prNumber: {
                repoOwner,
                repoName,
                prNumber
            }
        },
        update: {
            createdAt: new Date()
        },
        create: {
            repoOwner,
            repoName,
            prNumber,
        }
    });
    }


    // Mens vs Jules Conflict Detectie (Idee 50)
    // If a human adds a commit (pull_request synchronize) or a comment while Jules is processing, flag a conflict
    if (['pull_request', 'issue_comment', 'pull_request_review_comment'].includes(event)) {
        let isHumanAction = false;
        const senderType = body?.sender?.type;
        const senderLogin = body?.sender?.login;

        // Check if the actor is a human (not a bot, and not Jules if we could identify Jules's account)
        // Usually GitHub marks apps with [bot], so if type is User, it's likely a human
        if (senderType === 'User') {
            // Further filter: only check if this repo is tracked and has active sessions
            const repo = await prisma.repository.findFirst({
                where: { owner: repoOwner, name: repoName }
            });
            if (repo && prNumber) {
                // If the user's github token belongs to this sender, it might be the admin, but it's still a human.
                // We want to detect conflicts if an active BatchSession is running.
                const activeSession = await prisma.batchSession.findFirst({
                    where: {
                        repoOwner,
                        repoName,
                        prNumber,
                        isProcessed: false,
                        isPaused: false
                    }
                });

                // If Jules is actively processing (isProcessing = true or just an open session), and a human intervenes
                if (activeSession) {
                    await prisma.batchSession.update({
                        where: { id: activeSession.id },
                        data: { hasConflict: true }
                    });
                    logger.warn(`Conflict Detected in PR #${prNumber}: Human (${senderLogin}) interacted while Jules was active.`);
                }
            }
        }
    }

    // Auto-promote task based on GitHub activity (Idea 39)
    if ((event as string) === 'pull_request') {
        const action = body?.action;
        let statusToSet = null;
        if (action === 'opened' || action === 'reopened') {
            statusToSet = 'in_progress';
        } else if (action === 'review_requested') {
            statusToSet = 'in_review';
        } else if (action === 'closed' && body?.pull_request?.merged) {
            statusToSet = 'done';
        }
        if (statusToSet) {
           const repo = await prisma.repository.findFirst({
               where: { owner: repoOwner, name: repoName }
           });
           if (repo) {
               const tasksToUpdate = await prisma.task.findMany({
                   where: { repositoryId: repo.id, prNumber: prNumber }
               });

               for (const task of tasksToUpdate) {
                   if (task.dependsOnId) {
                       const dependency = await prisma.task.findUnique({
                           where: { id: task.dependsOnId },
                           select: { status: true }
                       });
                       if (!dependency || dependency.status !== 'done') {
                           continue; // Skip updating this task because dependency is unmet
                       }
                   }

                   await prisma.task.update({
                       where: { id: task.id },
                       data: { status: statusToSet }
                   });
               }
           }
        }
    }

    return NextResponse.json({ success: true, message: 'Webhook signal created' });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
