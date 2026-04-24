import { Prisma, PRLabelRuleEvent, RegressionMatchMode } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const json = await request.json()
    const updateData: any = {}


    let nextPrLabelRules: Array<{ event: PRLabelRuleEvent; labelName: string }> | undefined

    if (json.prLabelRules !== undefined) {
      if (!Array.isArray(json.prLabelRules)) {
        return NextResponse.json({ error: 'prLabelRules must be an array' }, { status: 400 });
      }
      const allowedEvents = new Set<PRLabelRuleEvent>(['processing_start', 'processing_done']);
      const seenRules = new Set<string>();
      const validatedRules: Array<{ event: PRLabelRuleEvent; labelName: string }> = [];

      for (const rule of json.prLabelRules) {
        const event = rule?.event as PRLabelRuleEvent;
        const labelName = typeof rule?.labelName === 'string' ? rule.labelName.trim() : '';
        if (!allowedEvents.has(event) || labelName === '') {
          return NextResponse.json({ error: 'Invalid prLabelRules entry' }, { status: 400 });
        }

        const key = `${event}\0${labelName}`;
        if (seenRules.has(key)) {
          return NextResponse.json({ error: 'Duplicate prLabelRules entry' }, { status: 400 });
        }
        seenRules.add(key);
        validatedRules.push({ event, labelName });
      }

      nextPrLabelRules = validatedRules;
    }

    if (json.isActive !== undefined) {
      if (typeof json.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
      }
      updateData.isActive = json.isActive
    }

    if (json.autoMergeEnabled !== undefined) {
      if (typeof json.autoMergeEnabled !== 'boolean') {
        return NextResponse.json({ error: 'autoMergeEnabled must be a boolean' }, { status: 400 })
      }
      updateData.autoMergeEnabled = json.autoMergeEnabled
    }

    if (json.requiredApprovals !== undefined) {
      const approvals = parseInt(json.requiredApprovals, 10)
      if (isNaN(approvals) || approvals < 0) {
        return NextResponse.json({ error: 'requiredApprovals must be a non-negative number' }, { status: 400 })
      }
      updateData.requiredApprovals = approvals
    }

    if (json.requireCI !== undefined) {
      if (typeof json.requireCI !== 'boolean') {
        return NextResponse.json({ error: 'requireCI must be a boolean' }, { status: 400 })
      }
      updateData.requireCI = json.requireCI
    }

    if (json.taskSourceType !== undefined) {
      if (!["none", "local_folder", "github_issues"].includes(json.taskSourceType)) {
        return NextResponse.json({ error: "Invalid taskSourceType" }, { status: 400 })
      }
      updateData.taskSourceType = json.taskSourceType
    }
    if (json.taskSourcePath !== undefined) {
      updateData.taskSourcePath = json.taskSourcePath === "" ? null : json.taskSourcePath
    }
    if (json.maxConcurrentTasks !== undefined) {
      const maxConcurrent = parseInt(json.maxConcurrentTasks, 10)
      if (isNaN(maxConcurrent) || maxConcurrent < 0) {
        return NextResponse.json({ error: "maxConcurrentTasks must be a non-negative number" }, { status: 400 })
      }
      updateData.maxConcurrentTasks = maxConcurrent
    }
    if (json.julesPromptTemplate !== undefined) {
      updateData.julesPromptTemplate = json.julesPromptTemplate === "" ? null : json.julesPromptTemplate
    }
    if (json.julesChatForwardMode !== undefined) {
      if (!["off", "always", "failsafe"].includes(json.julesChatForwardMode)) {
        return NextResponse.json({ error: "Invalid julesChatForwardMode" }, { status: 400 })
      }
      updateData.julesChatForwardMode = json.julesChatForwardMode
    }
    if (json.julesChatForwardDelay !== undefined) {
      const delay = parseInt(json.julesChatForwardDelay, 10)
      if (isNaN(delay) || delay < 0) {
        return NextResponse.json({ error: "julesChatForwardDelay must be a non-negative number" }, { status: 400 })
      }
      updateData.julesChatForwardDelay = delay
    }

    const stringOrNullFields = [
      'aiSystemPrompt', 'commentTemplate', 'branchWhitelist',
      'branchBlacklist', 'githubToken', 'requiredBots', 'aiBotUsernames'
    ];

    for (const field of stringOrNullFields) {
      if (json[field] !== undefined) {
        if (json[field] !== null && typeof json[field] !== 'string') {
          return NextResponse.json({ error: `${field} must be a string or null` }, { status: 400 });
        }
        updateData[field] = json[field] === '' ? null : json[field];
      }
    }


    if (json.regressionMatchMode !== undefined) {
      const modeMap: Record<string, RegressionMatchMode> = {
        'exact': RegressionMatchMode.EXACT,
        'type': RegressionMatchMode.TYPE,
        'fuzzy': RegressionMatchMode.FUZZY
      };
      if (typeof json.regressionMatchMode !== 'string' || !modeMap[json.regressionMatchMode.toLowerCase()]) {
        return NextResponse.json({ error: 'regressionMatchMode must be one of "exact", "type", "fuzzy"' }, { status: 400 });
      }
      updateData.regressionMatchMode = modeMap[json.regressionMatchMode.toLowerCase()];
    }
    if (json.complexityWeights !== undefined) {
      if (json.complexityWeights !== null && json.complexityWeights !== "") {
         try {
           const parsed = JSON.parse(json.complexityWeights);
           if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
              return NextResponse.json({ error: 'complexityWeights must be valid JSON object' }, { status: 400 });
           }
         } catch(e) {
           return NextResponse.json({ error: 'complexityWeights must be valid JSON object' }, { status: 400 });
         }
      }
      updateData.complexityWeights = json.complexityWeights === "" ? null : json.complexityWeights;
    }
    if (json.regressionDetection !== undefined) {
      if (typeof json.regressionDetection !== 'boolean') return NextResponse.json({ error: 'regressionDetection must be a boolean' }, { status: 400 });
      updateData.regressionDetection = json.regressionDetection;
    }
    if (json.infiniteLoopThreshold !== undefined) {
      const threshold = parseInt(json.infiniteLoopThreshold, 10);
      if (isNaN(threshold) || threshold < 0) return NextResponse.json({ error: 'infiniteLoopThreshold must be >= 0' }, { status: 400 });
      updateData.infiniteLoopThreshold = threshold;
    }
    if (json.maxDiffLines !== undefined) {
      const maxDiff = parseInt(json.maxDiffLines, 10);
      if (isNaN(maxDiff) || maxDiff < 0) return NextResponse.json({ error: 'maxDiffLines must be >= 0' }, { status: 400 });
      updateData.maxDiffLines = maxDiff;
    }

    if (json.postAggregatedComments !== undefined) {
      if (typeof json.postAggregatedComments !== 'boolean') {
        return NextResponse.json({ error: 'postAggregatedComments must be a boolean' }, { status: 400 })
      }
      updateData.postAggregatedComments = json.postAggregatedComments
    }

    if (json.includeCheckRuns !== undefined) {
      if (typeof json.includeCheckRuns !== 'boolean') {
        return NextResponse.json({ error: 'includeCheckRuns must be a boolean' }, { status: 400 })
      }
      updateData.includeCheckRuns = json.includeCheckRuns
    }

    if (json.mergeStrategy !== undefined) {
      if (!['merge', 'squash', 'rebase'].includes(json.mergeStrategy)) {
        return NextResponse.json({ error: 'Invalid mergeStrategy' }, { status: 400 })
      }
      updateData.mergeStrategy = json.mergeStrategy
    }



    if (json.batchDelay !== undefined) {
      if (json.batchDelay === null || json.batchDelay === '') {
        updateData.batchDelay = null
      } else {
        const delay = parseInt(json.batchDelay, 10)
        if (isNaN(delay) || delay < 0) {
          return NextResponse.json({ error: 'batchDelay must be a non-negative number or null' }, { status: 400 })
        }
        updateData.batchDelay = delay
      }
    }






    if (Object.keys(updateData).length === 0 && nextPrLabelRules === undefined) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 })
    }

    const repo = await prisma.$transaction(async (tx) => {
      if (nextPrLabelRules !== undefined) {
        await tx.repository.findUniqueOrThrow({
          where: { id },
          select: { id: true },
        });
        await tx.pRLabelRule.deleteMany({ where: { repositoryId: id } })
        if (nextPrLabelRules.length > 0) {
          await tx.pRLabelRule.createMany({
            data: nextPrLabelRules.map((rule) => ({ repositoryId: id, ...rule })),
          })
        }
      }
      return Object.keys(updateData).length > 0
        ? tx.repository.update({ where: { id }, data: updateData, include: { prLabelRules: true } })
        : tx.repository.findUniqueOrThrow({ where: { id }, include: { prLabelRules: true } })
    })

    const { githubToken, ...safeRepo } = repo;
    return NextResponse.json({ ...safeRepo, hasGithubToken: !!githubToken })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    console.error('Repository update error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const repo = await prisma.repository.findUnique({
      where: { id },
      include: { prLabelRules: true }
    });
    if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    const { githubToken, ...safeRepo } = repo;
    return NextResponse.json({ ...safeRepo, hasGithubToken: !!githubToken });
  } catch (error: any) {
    console.error("Repository fetch error", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await prisma.repository.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete repository' }, { status: 500 });
  }
}
