import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // We return a Response object with a custom ReadableStream to keep the connection open
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      // Close handling
      request.signal.addEventListener('abort', () => {
        isClosed = true;
      });

      const encoder = new TextEncoder();
      const sendEvent = (data: any) => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
      };

      try {
        // Initial setup/ping
        sendEvent({ type: 'ping' });

        // Polling loop for updates
        while (!isClosed) {
          const repo = await prisma.repository.findUnique({
            where: { id },
            select: { owner: true, name: true }
          });

          if (!repo) {
            isClosed = true;
            controller.close();
            return;
          }

          const sessions = await prisma.batchSession.findMany({
            where: {
              repoOwner: repo.owner,
              repoName: repo.name,
              isProcessed: false,
            },
            orderBy: { firstSeenAt: 'desc' },
            take: 20
          });

          sendEvent({ type: 'sessions', data: sessions });

          // Wait 10 seconds before polling again
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (err) {
        logger.error('SSE Error:', err);
        if (!isClosed) {
          isClosed = true;
          controller.error(err);
        }
      } finally {
        if (!isClosed) {
          controller.close();
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
