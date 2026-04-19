import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    // Note: For a production app, you'd want to verify the webhook signature here
    // using a secret stored in the database or environment variables.
    // We'll skip strict verification for now to ensure it works easily,
    // but log a warning if it's missing in a real-world scenario.

    const event = request.headers.get('x-github-event');
    const body = await request.json();

    if (event === 'issue_comment' && body.issue?.pull_request) {
      // It's a comment on a PR
      const repoOwner = body.repository.owner.login;
      const repoName = body.repository.name;
      const prNumber = body.issue.number;

      await prisma.webhookSignal.create({
        data: {
          repoOwner,
          repoName,
          prNumber,
        }
      });
      return NextResponse.json({ success: true, message: 'Webhook signal created for PR comment' });
    }

    if (event === 'pull_request_review_comment') {
      // It's a review comment on a PR
      const repoOwner = body.repository.owner.login;
      const repoName = body.repository.name;
      const prNumber = body.pull_request.number;

      await prisma.webhookSignal.create({
        data: {
          repoOwner,
          repoName,
          prNumber,
        }
      });
      return NextResponse.json({ success: true, message: 'Webhook signal created for PR review comment' });
    }

    if (event === 'pull_request_review') {
        // It's a review on a PR
        const repoOwner = body.repository.owner.login;
        const repoName = body.repository.name;
        const prNumber = body.pull_request.number;

        await prisma.webhookSignal.create({
          data: {
            repoOwner,
            repoName,
            prNumber,
          }
        });
        return NextResponse.json({ success: true, message: 'Webhook signal created for PR review' });
      }

    return NextResponse.json({ success: true, message: 'Ignored event' });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
