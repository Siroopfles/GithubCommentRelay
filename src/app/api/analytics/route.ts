import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Heatmap Data (Comments per day for the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const comments = await prisma.processedComment.findMany({
      where: {
        postedAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        postedAt: true
      }
    });

    const heatmapDataMap = new Map<string, number>();
    comments.forEach(comment => {
      const dateStr = comment.postedAt.toISOString().split('T')[0];
      heatmapDataMap.set(dateStr, (heatmapDataMap.get(dateStr) || 0) + 1);
    });

    const heatmapData = Array.from({ length: 30 }, (_, offset) => {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + offset + 1);
      const dateStr = date.toISOString().split('T')[0];
      return { date: dateStr, count: heatmapDataMap.get(dateStr) || 0 };
    });

    // 2. Fout-Categorie (Error Categories)
    const categoryCounts = await prisma.processedComment.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      where: {
        category: {
            not: null
        }
      }
    });

    const categoryData = categoryCounts.map(item => ({
        name: item.category || 'Unknown',
        value: item._count.category
    }));

    // 3. Rate Limit History (Last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const rateLimitLogsRaw = await prisma.rateLimitLog.findMany({
        where: {
            createdAt: {
                gte: twentyFourHoursAgo
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    const rateLimitData = rateLimitLogsRaw.map(log => ({
        time: log.createdAt.toISOString(),
        remaining: log.remaining,
        limit: log.limit
    }));

    // 4. Resolution Time & 5. Success Ratio
    const resolvedSessions = await prisma.batchSession.findMany({
        select: {
            firstSeenAt: true,
            resolvedAt: true
        },
        where: {
            resolved: true,
            resolvedAt: {
                not: null
            }
        }
    });

    let totalResolutionTime = 0;
    resolvedSessions.forEach(session => {
        if (session.resolvedAt) {
            const timeDiff = session.resolvedAt.getTime() - session.firstSeenAt.getTime();
            totalResolutionTime += timeDiff;
        }
    });

    const avgResolutionTimeMs = resolvedSessions.length > 0 ? totalResolutionTime / resolvedSessions.length : 0;
    const avgResolutionTimeHours = avgResolutionTimeMs / (1000 * 60 * 60);

    const [totalAiActions, successfulActions] = await Promise.all([
        prisma.aIAgentAction.count(),
        prisma.aIAgentAction.count({ where: { isSuccess: true } })
    ]);
    const aiSuccessRatio = totalAiActions > 0 ? (successfulActions / totalAiActions) * 100 : 0;

    return NextResponse.json({
      heatmapData,
      categoryData,
      rateLimitData,
      metrics: {
          avgResolutionTimeHours: Number(avgResolutionTimeHours.toFixed(2)),
          aiSuccessRatio: Number(aiSuccessRatio.toFixed(1)),
          totalResolved: resolvedSessions.length,
          totalAiActions
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
