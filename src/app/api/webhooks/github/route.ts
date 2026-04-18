import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headers = request.headers;
    const signature = headers.get('x-hub-signature-256');
    const eventType = headers.get('x-github-event');

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const secret = settings?.webhookSecret;

    if (secret) {
      if (!signature) {
        logger.warn('Webhook rejected: Missing signature');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

      const sigBuf = Buffer.from(signature);
      const digestBuf = Buffer.from(digest);
      if (sigBuf.length !== digestBuf.length || !crypto.timingSafeEqual(sigBuf, digestBuf)) {
        logger.warn('Webhook rejected: Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    if (eventType !== 'issue_comment' && eventType !== 'pull_request_review' && eventType !== 'pull_request_review_comment') {
      // We only care about comment-related events for aggregation
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const payload = JSON.parse(rawBody);

    let prNumber;
    let repoOwner;
    let repoName;

    if (payload.issue && payload.issue.pull_request) {
      prNumber = payload.issue.number;
      repoOwner = payload.repository.owner.login;
      repoName = payload.repository.name;
    } else if (payload.pull_request) {
      prNumber = payload.pull_request.number;
      repoOwner = payload.repository.owner.login;
      repoName = payload.repository.name;
    } else {
        return NextResponse.json({ message: 'Event ignored (not a PR)' }, { status: 200 });
    }

    if (payload.action === 'deleted') {
       return NextResponse.json({ message: 'Event ignored (deleted)' }, { status: 200 });
    }

    // Insert signal into database
    await prisma.webhookSignal.create({
      data: {
        repoOwner,
        repoName,
        prNumber
      }
    });

    logger.info(`Webhook received and signal queued for ${repoOwner}/${repoName} PR #${prNumber}`);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
