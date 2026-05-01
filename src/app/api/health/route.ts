import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import os from "os";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    const settings = await prisma.settings.findFirst();

    // Check if token is set in settings and matches
    if (!settings?.healthApiToken) {
      return NextResponse.json(
        { error: "Health API not configured" },
        { status: 403 },
      );
    }

    if (token !== settings.healthApiToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check DB
    await prisma.$queryRaw`SELECT 1`;

    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    const loadAverage = os.loadavg();

    const stats = {
      status: "ok",
      database: "connected",
      memory: {
        freeBytes: freeMemory,
        totalBytes: totalMemory,
        usagePercent: memoryUsagePercent.toFixed(2),
      },
      loadAverage: loadAverage,
      uptimeSeconds: os.uptime(),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", message: "Service unavailable" },
      { status: 503 },
    );
  }
}
