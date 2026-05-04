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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const json = await request.json()
    const encryptionKey = await getEncryptionKey();

    if (json.prLabelRules !== undefined) {
      return NextResponse.json({ error: "prLabelRules updates are not currently accepted via this endpoint" }, { status: 422 });
    }

    const updateData: any = {};
    if (json.owner !== undefined) {
      if (typeof json.owner !== "string" || json.owner.trim() === "") return NextResponse.json({ error: "owner must be a non-empty string" }, { status: 400 });
      updateData.owner = json.owner.trim();
    }
    if (json.name !== undefined) {
      if (typeof json.name !== "string" || json.name.trim() === "") return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
      updateData.name = json.name.trim();
    }
    if (json.groupName !== undefined) updateData.groupName = json.groupName;
    if (json.isActive !== undefined) updateData.isActive = json.isActive;
    if (json.autoMergeEnabled !== undefined) updateData.autoMergeEnabled = json.autoMergeEnabled;
    if (json.requiredApprovals !== undefined) { const v = parseInt(json.requiredApprovals, 10); updateData.requiredApprovals = (!isNaN(v) && v >= 0) ? v : 1; }
    if (json.requireCI !== undefined) updateData.requireCI = json.requireCI;

    if (json.mergeStrategy !== undefined) {
      if (!['merge', 'squash', 'rebase'].includes(json.mergeStrategy)) return NextResponse.json({ error: 'Invalid mergeStrategy' }, { status: 400 });
      updateData.mergeStrategy = json.mergeStrategy;
    }
    if (json.taskSourceType !== undefined) {
      if (!['none', 'local_folder', 'github_issues'].includes(json.taskSourceType)) return NextResponse.json({ error: 'Invalid taskSourceType' }, { status: 400 });
      updateData.taskSourceType = json.taskSourceType;
    }
    if (json.julesChatForwardMode !== undefined) {
      if (!['off', 'always', 'failsafe'].includes(json.julesChatForwardMode)) return NextResponse.json({ error: 'Invalid julesChatForwardMode' }, { status: 400 });
      updateData.julesChatForwardMode = json.julesChatForwardMode;
    }

    if (json.taskSourcePath !== undefined) updateData.taskSourcePath = json.taskSourcePath || null;
    if (json.maxConcurrentTasks !== undefined) { const v = parseInt(json.maxConcurrentTasks, 10); updateData.maxConcurrentTasks = (!isNaN(v) && v >= 0) ? v : 3; }
    if (json.julesPromptTemplate !== undefined) updateData.julesPromptTemplate = json.julesPromptTemplate || null;
    if (json.julesChatForwardDelay !== undefined) { const v = parseInt(json.julesChatForwardDelay, 10); updateData.julesChatForwardDelay = (!isNaN(v) && v >= 0) ? v : 5; }
    if (json.aiSystemPrompt !== undefined) updateData.aiSystemPrompt = json.aiSystemPrompt || null;
    if (json.commentTemplate !== undefined) updateData.commentTemplate = json.commentTemplate || null;
    if (json.postAggregatedComments !== undefined) updateData.postAggregatedComments = json.postAggregatedComments;
    if (json.includeCheckRuns !== undefined) updateData.includeCheckRuns = json.includeCheckRuns;
    if (json.batchDelay !== undefined) { const v = parseInt(json.batchDelay, 10); updateData.batchDelay = (!isNaN(v) && v >= 0) ? v : null; }
    if (json.branchWhitelist !== undefined) updateData.branchWhitelist = json.branchWhitelist || null;
    if (json.branchBlacklist !== undefined) updateData.branchBlacklist = json.branchBlacklist || null;
    if (json.requiredBots !== undefined) updateData.requiredBots = json.requiredBots || null;
    if (json.architectureInfo !== undefined) updateData.architectureInfo = json.architectureInfo || null;
    if (json.aiBotUsernames !== undefined) updateData.aiBotUsernames = json.aiBotUsernames || null;
    if (json.regressionDetection !== undefined) updateData.regressionDetection = json.regressionDetection;
    if (json.regressionMatchMode !== undefined) {
      const modeMap: Record<string, string> = { "exact": "EXACT", "type": "TYPE", "fuzzy": "FUZZY" };
      const key = typeof json.regressionMatchMode === "string" ? json.regressionMatchMode.toLowerCase() : "";
      if (!modeMap[key]) return NextResponse.json({ error: "regressionMatchMode must be one of 'exact', 'type', 'fuzzy'" }, { status: 400 });
      updateData.regressionMatchMode = modeMap[key];
    }
    if (json.infiniteLoopThreshold !== undefined) { const v = parseInt(json.infiniteLoopThreshold, 10); updateData.infiniteLoopThreshold = (!isNaN(v) && v >= 0) ? v : 3; }
    if (json.maxDiffLines !== undefined) { const v = parseInt(json.maxDiffLines, 10); updateData.maxDiffLines = (!isNaN(v) && v >= 0) ? v : 500; }
    if (json.complexityWeights !== undefined) updateData.complexityWeights = json.complexityWeights;

    if (json.githubToken !== undefined) {
       if (json.githubToken === '') {
           updateData.githubToken = null;
       } else {
           if (!encryptionKey) return NextResponse.json({ error: 'Unauthorized to encrypt tokens. Please log in again.' }, { status: 401 });
           updateData.githubToken = encrypt(json.githubToken, encryptionKey);
       }
    }

    const repo = await prisma.repository.update({
      where: { id: id },
      data: updateData
    })

    const { githubToken: _, ...safeRepo } = repo;
    return NextResponse.json({ ...safeRepo, hasGithubToken: !!repo.githubToken })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update repository' }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    await prisma.repository.delete({
      where: { id: id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete repository' }, { status: 400 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAuthenticated())) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const repo = await prisma.repository.findUnique({
            where: { id: id },
            include: { prLabelRules: true }
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
