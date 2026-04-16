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
      const { data } = await octokit.rest.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        per_page: 50
      })
      prs = data
    } catch (githubError: any) {
      console.error('GitHub API Error:', githubError)
      return NextResponse.json({ error: 'Failed to fetch PRs from GitHub', details: githubError.message }, { status: 500 })
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
    const combinedData = prs.map(pr => {
      const prComments = processedComments.filter(c => c.prNumber === pr.number)
      const prSessions = batchSessions.filter(s => s.prNumber === pr.number)
      const prLogs = logs.filter(l => l.prNumber === pr.number)

      const activeSession = prSessions.find(s => !s.isProcessed)

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
        batch_session: activeSession,
        processed_comments: prComments,
        recent_logs: prLogs.slice(0, 5) // Send top 5 recent logs per PR
      }
    })

    return NextResponse.json({
      repository: { owner: repo.owner, name: repo.name },
      prs: combinedData
    })

  } catch (error: any) {
    console.error('Error fetching PR details:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
