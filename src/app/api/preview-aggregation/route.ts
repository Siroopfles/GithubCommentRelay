import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { repoId } = await request.json()

    if (!repoId) {
      return NextResponse.json({ error: 'repoId is required' }, { status: 400 })
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repoId }
    })

    if (!repo) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // Mock comments for preview
    const mockComments = [
        {
            source: 'eslint',
            author: 'eslint-bot',
            body: 'Line 42: Parsing error: Unexpected token',
            nodeId: 'mock-node-1',
            postedAt: new Date(),
        },
        {
            source: 'typescript',
            author: 'tsc-bot',
            body: 'Type \'string\' is not assignable to type \'number\'.',
            nodeId: 'mock-node-2',
            postedAt: new Date(Date.now() + 1000),
        }
    ];

    // Helper from worker.ts to format the body
    let aggregatedBody = '## 🤖 Bot Comment Aggregation\n\n'

    if (repo.aiSystemPrompt) {
        aggregatedBody += `> **System Prompt:** ${repo.aiSystemPrompt}\n\n---\n\n`
    }

    aggregatedBody += `*Aggregated feedback from various CI/CD bots on this PR.*\n\n`

    for (const comment of mockComments) {
        let commentContent = comment.body

        if (repo.commentTemplate) {
            commentContent = repo.commentTemplate
                .replace('{{bot_name}}', comment.author)
                .replace('{{source}}', comment.source)
                .replace('{{body}}', comment.body)
        } else {
             commentContent = `### From ${comment.author} (${comment.source})\n${comment.body}\n`
        }

        aggregatedBody += `${commentContent}\n---\n`
    }

    // Add JSON injection block if we want to preview it
    const jsonContext = mockComments.map(c => ({
        source: c.source,
        author: c.author,
        body: c.body
    }))

    aggregatedBody += `\n<details><summary>System Metadata (JSON)</summary>\n\n\`\`\`json\n${JSON.stringify(jsonContext, null, 2)}\n\`\`\`\n</details>`


    return NextResponse.json({ success: true, preview: aggregatedBody })
  } catch (error) {
    console.error('Failed to generate preview:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
