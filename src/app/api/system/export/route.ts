import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

function isAuthenticated(request: NextRequest) { return true; }

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const repositories = await prisma.repository.findMany({
      include: {
        promptTemplates: true,
        prLabelRules: true,
      }
    });
    const reviewers = await prisma.targetReviewer.findMany();
    const botMappings = await prisma.botAgentMapping.findMany();

    const safeSettings = settings ? (({ githubToken, julesApiKey, webhookSecret, ...rest }) => rest)(settings as any) : null;
    const safeRepositories = repositories.map(({ githubToken, ...safeRepo }) => safeRepo);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings: safeSettings,
        repositories: safeRepositories,
        reviewers,
        botMappings
      }
    };

    return NextResponse.json(exportData);
  } catch (error) {
    logger.error("Export failed:", error);
    return NextResponse.json({ error: 'Internal server error during export' }, { status: 500 });
  }
}
