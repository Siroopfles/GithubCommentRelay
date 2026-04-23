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
               await prisma.task.updateMany({
                   where: { repositoryId: repo.id, prNumber: prNumber, dependsOnId: null },
                   data: { status: statusToSet }
               });
           }
        }
    }

    return NextResponse.json({ success: true, message: 'Webhook signal created' });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
