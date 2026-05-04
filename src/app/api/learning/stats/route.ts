import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/apiAuth";



export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const feedback = await prisma.agentFeedback.aggregate({
      _sum: {
        upvotes: true,
        downvotes: true,
      }
    });

    const flaky = await prisma.flakyTestRule.aggregate({
      _sum: { ignoreCount: true }
    });

    const rewrites = await prisma.errorRewriteRule.aggregate({
      _sum: { applyCount: true }
    });

    const ttrData = await prisma.resolutionTime.groupBy({
      by: ['category'],
      _avg: {
        durationSecs: true,
      }
    });

    const ttrMetrics = ttrData.map(d => ({
      category: d.category,
      avgDuration: d._avg.durationSecs || 0
    })).sort((a, b) => b.avgDuration - a.avgDuration);

    const maxTtr = ttrMetrics.length > 0 ? Math.max(...ttrMetrics.map(t => t.avgDuration)) : 1;

    return NextResponse.json({
      totalUpvotes: feedback._sum.upvotes || 0,
      totalDownvotes: feedback._sum.downvotes || 0,
      totalFlakyIgnored: flaky._sum.ignoreCount || 0,
      totalRewritesApplied: rewrites._sum.applyCount || 0,
      ttrMetrics,
      maxTtr
    });
  } catch (error) {
    logger.error("Error fetching learning stats", { error });
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
