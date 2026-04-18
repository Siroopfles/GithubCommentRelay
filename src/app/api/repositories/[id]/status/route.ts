import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Octokit } from 'octokit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const repo = await prisma.repository.findUnique({
      where: { id }
    })

    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    const settings = await prisma.settings.findUnique({ where: { id: 1 } })
    if (!settings?.githubToken) {
      return NextResponse.json({ status: 'error', message: 'No GitHub token configured' }, { status: 200 })
    }

    const octokit = new Octokit({ auth: settings.githubToken })

    // Try to fetch the repository details to check connection
    try {
        await octokit.rest.repos.get({
            owner: repo.owner,
            repo: repo.name,
        });
        return NextResponse.json({ status: 'ok', message: 'Connected' }, { status: 200 })
    } catch (githubError: any) {
        if (githubError.status === 404) {
             return NextResponse.json({ status: 'error', message: 'Repository not found or no access' }, { status: 200 })
        } else if (githubError.status === 401) {
             return NextResponse.json({ status: 'error', message: 'Invalid GitHub token' }, { status: 200 })
        }
        return NextResponse.json({ status: 'error', message: githubError.message || 'Unknown GitHub API error' }, { status: 200 })
    }

  } catch (error: any) {
    logger.error("Status check failed:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
