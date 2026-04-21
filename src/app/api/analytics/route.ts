import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const heatmapData = Array.from(heatmapDataMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

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
        time: log.createdAt.toLocaleTimeString(),
        remaining: log.remaining,
        limit: log.limit
    }));

    // 4. Resolution Time & 5. Success Ratio
    const resolvedSessions = await prisma.batchSession.findMany({
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

    const aiActions = await prisma.aIAgentAction.findMany();
    const successfulActions = aiActions.filter(action => action.isSuccess).length;
    const aiSuccessRatio = aiActions.length > 0 ? (successfulActions / aiActions.length) * 100 : 0;

    return NextResponse.json({
      heatmapData,
      categoryData,
      rateLimitData,
      metrics: {
          avgResolutionTimeHours: avgResolutionTimeHours.toFixed(2),
          aiSuccessRatio: aiSuccessRatio.toFixed(1),
          totalResolved: resolvedSessions.length,
          totalAiActions: aiActions.length
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
