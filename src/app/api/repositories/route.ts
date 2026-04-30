import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sessionStore } from '@/lib/sessionStore';

async function getEncryptionKey() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return null;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.sessionSecret) return null;

  const session = await verifySession(settings.sessionSecret, sessionCookie.value);
  return session?.sessionId ? (sessionStore.get(session.sessionId) || null) : null;
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return false;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.sessionSecret) return false;

  const session = await verifySession(settings.sessionSecret, sessionCookie.value);
  return !!session?.loggedIn;
}

export async function GET() {
  const repos = await prisma.repository.findMany({ orderBy: { createdAt: 'desc' } })
  const safeRepos = repos.map(repo => {
    const { githubToken, ...rest } = repo;
    return { ...rest, hasGithubToken: !!githubToken };
  });
  return NextResponse.json(safeRepos)
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  let finalGithubToken = null;
  if (typeof githubToken === "string" && githubToken !== "") {
     if (!encryptionKey) return NextResponse.json({ error: 'Unauthorized to encrypt tokens. Please log in again.' }, { status: 401 });
     finalGithubToken = encrypt(githubToken, encryptionKey);
  }

  try {
    const repo = await prisma.repository.create({
      data: {
        owner,
        name,
        groupName: groupName || 'Default',
        autoMergeEnabled: autoMergeEnabled || false,
        requiredApprovals: parsedApprovals,
        requireCI: requireCI !== undefined ? requireCI : true,
        mergeStrategy: ['merge', 'squash', 'rebase'].includes(mergeStrategy) ? mergeStrategy : 'merge',
        taskSourceType: validTaskSourceType,
        taskSourcePath: taskSourcePath || null,
        maxConcurrentTasks: (() => {
          if (maxConcurrentTasks !== undefined) {
             const m = typeof maxConcurrentTasks === 'number' ? maxConcurrentTasks : parseInt(maxConcurrentTasks, 10);
             return (!isNaN(m) && m >= 0) ? m : 3;
          }
          return 3;
        })(),
        julesPromptTemplate: julesPromptTemplate || null,
        julesChatForwardMode: validJulesChatForwardMode,
        julesChatForwardDelay: parsedDelay,
        aiSystemPrompt: (typeof aiSystemPrompt === "string" && aiSystemPrompt !== "") ? aiSystemPrompt : null,
        commentTemplate: (typeof commentTemplate === "string" && commentTemplate !== "") ? commentTemplate : null,
        postAggregatedComments: postAggregatedComments !== undefined ? postAggregatedComments : true,
        batchDelay: parsedBatchDelay,
        branchWhitelist: typeof branchWhitelist === "string" && branchWhitelist !== "" ? branchWhitelist : null,
        branchBlacklist: typeof branchBlacklist === "string" && branchBlacklist !== "" ? branchBlacklist : null,
        githubToken: finalGithubToken,
        requiredBots: typeof requiredBots === "string" && requiredBots !== "" ? requiredBots : null
      }
    })
    const { githubToken: _, ...safeRepo } = repo;
    return NextResponse.json({ ...safeRepo, hasGithubToken: !!repo.githubToken })
  } catch (error) {
    return NextResponse.json({ error: 'Repository already exists or validation failed' }, { status: 400 })
  }
}
