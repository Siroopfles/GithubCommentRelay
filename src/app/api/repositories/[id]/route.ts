import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getEncryptionKey() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return null;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.sessionSecret) return null;

  const session = await verifySession(settings.sessionSecret, sessionCookie.value);
  return session?.encryptionKey || null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  try {
    const { owner, name, groupName, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, maxConcurrentTasks, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate, postAggregatedComments, batchDelay, branchWhitelist, branchBlacklist, githubToken, requiredBots } = await request.json()
    const encryptionKey = await getEncryptionKey();

    let parsedApprovals = 1;
    if (requiredApprovals !== undefined) {
      parsedApprovals = parseInt(requiredApprovals, 10);
      if (isNaN(parsedApprovals) || parsedApprovals < 0) {
        return NextResponse.json({ error: 'requiredApprovals must be a non-negative number' }, { status: 400 });
      }
    }

    let parsedDelay = 5;
    if (julesChatForwardDelay !== undefined) {
        const d = parseInt(julesChatForwardDelay, 10);
        if (!isNaN(d) && d >= 0) {
            parsedDelay = d;
        }
    }

    if (postAggregatedComments !== undefined && typeof postAggregatedComments !== 'boolean') {
        return NextResponse.json({ error: 'postAggregatedComments must be a boolean' }, { status: 400 })
    }

    const validTaskSourceType = ['none', 'local_folder', 'github_issues'].includes(taskSourceType) ? taskSourceType : 'none';
    const validJulesChatForwardMode = ['off', 'always', 'failsafe'].includes(julesChatForwardMode) ? julesChatForwardMode : 'off';


    let parsedBatchDelay: number | null = null;
    if (batchDelay !== undefined && batchDelay !== null && batchDelay !== '') {
      const d = parseInt(batchDelay, 10);
      if (isNaN(d) || d < 0) {
        return NextResponse.json({ error: 'batchDelay must be a non-negative integer or null' }, { status: 400 });
      }
      parsedBatchDelay = d;
    }

    const updateData: any = {
        owner,
        name,
        groupName: groupName || 'Default',
        autoMergeEnabled: autoMergeEnabled !== undefined ? autoMergeEnabled : undefined,
        requiredApprovals: parsedApprovals,
        requireCI: requireCI !== undefined ? requireCI : undefined,
        mergeStrategy: ['merge', 'squash', 'rebase'].includes(mergeStrategy) ? mergeStrategy : undefined,
        taskSourceType: validTaskSourceType,
        taskSourcePath: taskSourcePath || null,
        maxConcurrentTasks: (() => {
            if (maxConcurrentTasks !== undefined) {
               const m = typeof maxConcurrentTasks === 'number' ? maxConcurrentTasks : parseInt(maxConcurrentTasks, 10);
               return (!isNaN(m) && m >= 0) ? m : 3;
            }
            return undefined;
        })(),
        julesPromptTemplate: julesPromptTemplate || null,
        julesChatForwardMode: validJulesChatForwardMode,
        julesChatForwardDelay: parsedDelay,
        aiSystemPrompt: (typeof aiSystemPrompt === "string" && aiSystemPrompt !== "") ? aiSystemPrompt : null,
        commentTemplate: (typeof commentTemplate === "string" && commentTemplate !== "") ? commentTemplate : null,
        postAggregatedComments: postAggregatedComments !== undefined ? postAggregatedComments : undefined,
        batchDelay: parsedBatchDelay,
        branchWhitelist: typeof branchWhitelist === "string" && branchWhitelist !== "" ? branchWhitelist : null,
        branchBlacklist: typeof branchBlacklist === "string" && branchBlacklist !== "" ? branchBlacklist : null,
        requiredBots: typeof requiredBots === "string" && requiredBots !== "" ? requiredBots : null
    };

    if (githubToken !== undefined) {
       if (githubToken === '') {
           updateData.githubToken = null;
       } else {
           if (!encryptionKey) return NextResponse.json({ error: 'Unauthorized to encrypt tokens. Please log in again.' }, { status: 401 });
           updateData.githubToken = encrypt(githubToken, encryptionKey);
       }
    }


    const repo = await prisma.repository.update({
      where: { id: id },
      data: updateData
    })

    const { githubToken: _, ...safeRepo } = repo;
    return NextResponse.json({ ...safeRepo, hasGithubToken: !!repo.githubToken })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update repository' }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  try {
    await prisma.repository.delete({
      where: { id: id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete repository' }, { status: 400 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
    try {
        const repo = await prisma.repository.findUnique({
            where: { id: id }
        })

        if (!repo) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        const { githubToken, ...safeRepo } = repo;
        return NextResponse.json({ ...safeRepo, hasGithubToken: !!githubToken })
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}
