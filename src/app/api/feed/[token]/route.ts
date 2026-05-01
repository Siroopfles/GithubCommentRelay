import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import RSS from "rss";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const settings = await prisma.settings.findFirst();

    if (!settings?.rssSecretToken || token !== settings.rssSecretToken) {
      return new NextResponse("Unauthorized or RSS not configured", {
        status: 401,
      });
    }

    let rssEvents: string[] = [];
    if (settings.rssEvents) {
      try {
        rssEvents = JSON.parse(settings.rssEvents);
      } catch (e) {
        // ignore
      }
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const feed = new RSS({
      title: "GitHub PR Comment Aggregator",
      description: "System actions and notifications",
      feed_url: `${baseUrl}/api/feed/${token}`,
      site_url: baseUrl,
      image_url: `${baseUrl}/favicon.ico`,
      pubDate: new Date(),
    });

    if (rssEvents.includes("PR_AGGREGATED")) {
      const recentSessions = await prisma.batchSession.findMany({
        where: { isProcessed: true },
        orderBy: { resolvedAt: "desc" },
        take: 20,
      });

      recentSessions.forEach((s) => {
        feed.item({
          title: `PR Aggregated: ${s.repoOwner}/${s.repoName}#${s.prNumber}`,
          description: `Successfully processed PR #${s.prNumber} in ${s.repoOwner}/${s.repoName}. Loops: ${s.loopCount}`,
          url: `${baseUrl}/repositories/${s.repoOwner}-${s.repoName}`,
          date: s.resolvedAt || s.firstSeenAt,
        });
      });
    }

    if (rssEvents.includes("SYSTEM_ERROR")) {
      const recentLogs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      recentLogs.forEach((l) => {
        feed.item({
          title: `System Event: ${l.action}`,
          description: l.details || `Event on entity ${l.entity}`,
          url: `${baseUrl}/settings`,
          date: l.createdAt,
        });
      });
    }

    return new NextResponse(feed.xml({ indent: true }), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to generate RSS feed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
