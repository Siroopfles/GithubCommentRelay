import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

    // Remove sensitive data
    if (settings) {
      // @ts-ignore
      delete settings.githubToken;
      // @ts-ignore
      delete settings.julesApiKey;
      // @ts-ignore
      delete settings.webhookSecret;
    }

    const safeRepositories = repositories.map(repo => {
      const { githubToken, ...safeRepo } = repo;
      return safeRepo;
    });

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        repositories: safeRepositories,
        reviewers,
        botMappings
      }
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: 'Internal server error during export' }, { status: 500 });
  }
}
