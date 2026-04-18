import { logger } from "@/lib/logger";
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Octokit } from 'octokit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: repoId } = await params

    // Fetch repository details
    const repo = await prisma.repository.findUnique({
      where: { id: repoId }
    })

    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // Fetch GitHub Token from settings
    const settings = await prisma.settings.findUnique({ where: { id: 1 } })

    if (!settings?.githubToken) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 400 })
    }

    const octokit = new Octokit({ auth: settings.githubToken })

    // 1. Fetch live Open PRs from GitHub
    let prs = []
    try {
      prs = await octokit.paginate(octokit.rest.pulls.list, {
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        per_page: 100
      })
    } catch (githubError: any) {
      logger.error('GitHub API Error:', {
        message: githubError?.message,
        status: githubError?.status,
        rateLimitRemaining: githubError?.response?.headers?.['x-ratelimit-remaining'],
        rateLimitReset: githubError?.response?.headers?.['x-ratelimit-reset'],
      })
      return NextResponse.json({ error: 'Failed to fetch PRs from GitHub' }, { status: 500 })
    }

    // 2. Fetch local data for these PRs
    const prNumbers = prs.map(pr => pr.number)

    const [processedComments, batchSessions, logs] = await Promise.all([
      prisma.processedComment.findMany({
        where: {
          repoOwner: repo.owner,
          repoName: repo.name,
          prNumber: { in: prNumbers }
        },
        orderBy: { postedAt: 'desc' }
      }),
      prisma.batchSession.findMany({
        where: {
          repoOwner: repo.owner,
          repoName: repo.name,
          prNumber: { in: prNumbers }
        }
      }),
      prisma.autoMergeLog.findMany({
        where: {
          repoOwner: repo.owner,
          repoName: repo.name,
          prNumber: { in: prNumbers }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    // Combine data
    const commentsMap = new Map();
    processedComments.forEach(c => {
      if (!commentsMap.has(c.prNumber)) commentsMap.set(c.prNumber, []);
      commentsMap.get(c.prNumber).push(c);
    });

    const sessionsMap = new Map();
    batchSessions.forEach(s => {
      if (!sessionsMap.has(s.prNumber)) sessionsMap.set(s.prNumber, []);
      sessionsMap.get(s.prNumber).push(s);
    });

    const logsMap = new Map();
    logs.forEach(l => {
      if (!logsMap.has(l.prNumber)) logsMap.set(l.prNumber, []);
      logsMap.get(l.prNumber).push(l);
    });

    const combinedData = prs.map(pr => {
      const prComments = commentsMap.get(pr.number) || []
      const prSessions = sessionsMap.get(pr.number) || []
      const prLogs = logsMap.get(pr.number) || []

      const activeSession = prSessions.find((s: any) => !s.isProcessed)

      return {
        number: pr.number,
        title: pr.title,
        author: pr.user?.login,
        state: pr.state,
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        comments_count: prComments.length,
        is_batching: !!activeSession,
        batch_session: activeSession ? {
          id: activeSession.id,
          prNumber: activeSession.prNumber,
          repoOwner: activeSession.repoOwner,
          repoName: activeSession.repoName,
          firstSeenAt: activeSession.firstSeenAt,
          isProcessed: activeSession.isProcessed,
          isProcessing: activeSession.isProcessing
        } : null,
        processed_comments: prComments.map((c: any) => ({
          id: c.id,
          author: c.author,
          postedAt: c.postedAt,
          body: c.body,
          commentId: c.commentId.toString()
        })),
        recent_logs: prLogs.slice(0, 5).map((l: any) => ({
          id: l.id,
          status: l.status,
          message: l.message,
          createdAt: l.createdAt
        }))
      }
    })

    return NextResponse.json({
      repository: { owner: repo.owner, name: repo.name },
      prs: combinedData
    })

  } catch (error: any) {
    logger.error('Error fetching PR details:', {
      message: (error as any)?.message,
      status: (error as any)?.status,
      rateLimitRemaining: (error as any)?.response?.headers?.['x-ratelimit-remaining'],
      rateLimitReset: (error as any)?.response?.headers?.['x-ratelimit-reset'],
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
