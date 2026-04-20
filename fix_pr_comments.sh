# 1. Update JOURNAL.md
sed -i 's/2024-xx-xx: Category F - Advanced GitHub Integrations/2026-04-20: Category F - Advanced GitHub Integrations/' JOURNAL.md
sed -i 's/Added UI interface within/Added UI within/' JOURNAL.md

# 2. Update src/app/api/repositories/[id]/pr/[prNumber]/trigger-checks/route.ts
cat << 'ROUTE' > src/app/api/repositories/\[id\]/pr/\[prNumber\]/trigger-checks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Octokit } from 'octokit';

const createOctokit = (token: string) => new Octokit({ auth: token });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string, prNumber: string }> }) {
  const { id, prNumber } = await params;

  try {
    const pullNumber = Number(prNumber);
    if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
      return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
    }

    const repo = await prisma.repository.findUnique({ where: { id } });
    if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const token = repo.githubToken || settings?.githubToken;

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 400 });
    }

    const octokit = createOctokit(token);

    // First, get the PR to find the head commit SHA
    const { data: prData } = await octokit.rest.pulls.get({
        owner: repo.owner,
        repo: repo.name,
        pull_number: pullNumber
    });

    const headSha = prData.head.sha;

    // Fetch check runs for the ref to find the check suite IDs associated with failed runs
    const checkRuns = await octokit.paginate(octokit.rest.checks.listForRef, {
        owner: repo.owner,
        repo: repo.name,
        ref: headSha,
        per_page: 100
    });

    const failedSuites = new Set<number>();
    for (const run of checkRuns) {
        if (run.conclusion === 'failure' || run.conclusion === 'cancelled' || run.conclusion === 'timed_out' || run.conclusion === 'action_required') {
           if(run.check_suite?.id) {
               failedSuites.add(run.check_suite.id);
           }
        }
    }

    if (failedSuites.size === 0) {
        return NextResponse.json({ message: 'No failed check suites found to restart.' });
    }

    // Trigger re-run for each failed suite
    for (const suiteId of failedSuites) {
        await octokit.rest.checks.rerequestSuite({
            owner: repo.owner,
            repo: repo.name,
            check_suite_id: suiteId
        });
    }

    return NextResponse.json({ success: true, message: `Requested re-run for ${failedSuites.size} check suite(s).` });
  } catch (error) {
    console.error("Trigger checks error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
ROUTE

# 3. Update src/app/api/repositories/[id]/route.ts (Atomic labels + generic 500)
cat << 'ROUTE2' > src/app/api/repositories/\[id\]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const json = await request.json()
    const updateData: any = {}

    let nextPrLabelRules: Array<{ event: string; labelName: string }> | undefined

    if (json.prLabelRules !== undefined) {
      if (!Array.isArray(json.prLabelRules)) {
        return NextResponse.json({ error: 'prLabelRules must be an array' }, { status: 400 });
      }
      nextPrLabelRules = json.prLabelRules.map((rule: any) => {
        if (
          !['processing_start', 'processing_done'].includes(rule?.event) ||
          typeof rule?.labelName !== 'string' ||
          rule.labelName.trim() === ''
        ) {
          throw new Error('Invalid prLabelRules entry')
        }
        return { event: rule.event, labelName: rule.labelName.trim() }
      })
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

    if (json.aiSystemPrompt !== undefined) {
      updateData.aiSystemPrompt = json.aiSystemPrompt === '' ? null : json.aiSystemPrompt
    }

    if (json.commentTemplate !== undefined) {
      updateData.commentTemplate = json.commentTemplate === '' ? null : json.commentTemplate
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

    if (json.branchWhitelist !== undefined) {
      updateData.branchWhitelist = json.branchWhitelist === '' ? null : json.branchWhitelist
    }

    if (json.branchBlacklist !== undefined) {
      updateData.branchBlacklist = json.branchBlacklist === '' ? null : json.branchBlacklist
    }

    if (json.githubToken !== undefined) {
      updateData.githubToken = json.githubToken === '' ? null : json.githubToken
    }

    if (json.requiredBots !== undefined) {
        updateData.requiredBots = json.requiredBots === '' ? null : json.requiredBots;
    }


    if (Object.keys(updateData).length === 0 && nextPrLabelRules === undefined) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 })
    }

    const repo = await prisma.$transaction(async (tx) => {
      if (nextPrLabelRules !== undefined) {
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

    return NextResponse.json(repo)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    return NextResponse.json(repo);
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
    return NextResponse.json({ error: 'Failed to delete repository' }, { status: 500 })
  }
}
ROUTE2

# 4. Update src/app/api/repositories/[id]/sessions/[sessionId]/route.ts
cat << 'ROUTE3' > src/app/api/repositories/\[id\]/sessions/\[sessionId\]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string, sessionId: string }> }) {
  const { id, sessionId } = await params;

  try {
    const json = await request.json();

    if (json.includeCheckRuns !== undefined) {
      if (typeof json.includeCheckRuns !== 'boolean') {
        return NextResponse.json({ error: 'includeCheckRuns must be a boolean' }, { status: 400 });
      }

      const repo = await prisma.repository.findUnique({
        where: { id },
        select: { owner: true, name: true },
      });
      if (!repo) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }

      const result = await prisma.batchSession.updateMany({
        where: { id: sessionId, repoOwner: repo.owner, repoName: repo.name },
        data: { includeCheckRuns: json.includeCheckRuns }
      });
      if (result.count === 0) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
ROUTE3

# 5. Update worker.ts pagination, add label to claimed block, fix shadowing
cat << 'WORKERPATCH' > patch_worker_final.js
const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');

// Replace checks.listForRef with paginate
const checkSearch = \`                    const { data: checksData } = await octokit.rest.checks.listForRef({
                        owner: session.repoOwner,
                        repo: session.repoName,
                        ref: headSha
                    });

                    if (checksData.check_runs.length > 0) {
                        checkRunsContent = "\\\\n\\\\n### CI Check Runs\\\\n";
                        checksData.check_runs.forEach((run: any) => {\`;

const checkReplace = \`                    const checkRuns = await octokit.paginate(octokit.rest.checks.listForRef, {
                        owner: session.repoOwner,
                        repo: session.repoName,
                        ref: headSha,
                        per_page: 100
                    });

                    if (checkRuns.length > 0) {
                        checkRunsContent = "\\\\n\\\\n### CI Check Runs\\\\n";
                        checkRuns.forEach((run: any) => {\`;

code = code.replace(checkSearch, checkReplace);

// Replace pulls.listReviewComments with paginate
const reviewSearch = \`                  const { data: prReviewComments } = await octokit.rest.pulls.listReviewComments({
                      owner: session.repoOwner,
                      repo: session.repoName,
                      pull_number: session.prNumber,
                      per_page: 100
                  });\`;

const reviewReplace = \`                  const prReviewComments = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
                      owner: session.repoOwner,
                      repo: session.repoName,
                      pull_number: session.prNumber,
                      per_page: 100
                  });\`;

code = code.replace(reviewSearch, reviewReplace);


// Fix processing_start logic after atomic claim
// First claim site
const claimSearch = \`          if (claimed.count === 0) continue; // Someone else claimed it

          try {
            // First we need to get the octokit client\`;

const claimReplace = \`          if (claimed.count === 0) continue; // Someone else claimed it

          try {
              const startRules = await prisma.pRLabelRule.findMany({
                  where: { repository: { owner: session.repoOwner, name: session.repoName }, event: 'processing_start' }
              });
              const t = repoConfig?.githubToken || settings?.githubToken;
              if (t && startRules.length > 0) {
                  const octo = createOctokit(t);
                  await octo.rest.issues.addLabels({
                      owner: session.repoOwner,
                      repo: session.repoName,
                      issue_number: session.prNumber,
                      labels: startRules.map((r: any) => r.labelName)
                  });
              }
          } catch (labelErr) {
              logger.warn(\\\`Failed to apply processing_start labels to PR #\${session.prNumber}\\\`, labelErr);
          }

          try {
            // First we need to get the octokit client\`;

code = code.replace(claimSearch, claimReplace);

// Remove the old processing_start logic which was in the wrong place and duplicated
const oldStartSearch = \`          // Trigger label sync: processing_start
          try {
              const startRules = await prisma.pRLabelRule.findMany({
                  where: { repository: { owner: session.repoOwner, name: session.repoName }, event: 'processing_start' }
              });
              const repoConfig = await prisma.repository.findFirst({ where: { owner: session.repoOwner, name: session.repoName } });
              const t = repoConfig?.githubToken || settings?.githubToken;
              if (t && startRules.length > 0) {
                  const octo = createOctokit(t);
                  await octo.rest.issues.addLabels({
                      owner: session.repoOwner,
                      repo: session.repoName,
                      issue_number: session.prNumber,
                      labels: startRules.map((r: any) => r.labelName)
                  });
              }
          } catch (labelErr) {
              logger.warn(\\\`Failed to apply processing_start labels to PR #\${session.prNumber}\\\`, labelErr);
          }\`;

code = code.replace(oldStartSearch, "");

// Fix variable shadowing in processing_done
const doneShadowingSearch = \`              const repoConfig = await prisma.repository.findFirst({ where: { owner: session.repoOwner, name: session.repoName } });
              const t = repoConfig?.githubToken || settings?.githubToken;\`;

const doneShadowingReplace = \`              const t = repoConfig?.githubToken || settings?.githubToken;\`;
code = code.replace(doneShadowingSearch, doneShadowingReplace);

fs.writeFileSync('worker.ts', code);
WORKERPATCH
node patch_worker_final.js && rm patch_worker_final.js

# 6. Update src/app/repositories/[id]/page.tsx (SSE integration)
cat << 'PAGEPATCH' > patch_repo_page2.js
const fs = require('fs');
let code = fs.readFileSync('src/app/repositories/[id]/page.tsx', 'utf8');

const oldSseSearch = \`  useEffect(() => {
    const eventSource = new EventSource(\\\`/api/repositories/\${params.id}/sse\\\`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'sessions') {
          setSessions(parsed.data);
          setLoading(false);
          setIsInitialLoad(false);
        }
      } catch (e) {
        console.error('Failed to parse SSE data', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [params.id]);

  const loadData = async () => {\`;

const newSseReplace = \`  useEffect(() => {
    loadData();

    const events = new EventSource(\\\`/api/repositories/\${params.id}/sse\\\`);
    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'sessions') {
          setSessions(payload.data);
          setLoading(false);
          setIsInitialLoad(false);
          setError(null);
        }
      } catch (e) {
        console.error('Failed to parse SSE data', e);
      }
    };

    events.onerror = () => {
      setError('Lost live update connection');
    };

    return () => events.close();
  }, [params.id]);

  const loadData = async () => {\`;

code = code.replace(oldSseSearch, newSseReplace);

// remove the extra loadData hook
const extraLoadData = \`  useEffect(() => {
    loadData();
  }, [params.id]);\`;
code = code.replace(extraLoadData, "");

fs.writeFileSync('src/app/repositories/[id]/page.tsx', code);
PAGEPATCH
node patch_repo_page2.js && rm patch_repo_page2.js

# 7. Update src/app/api/repositories/[id]/sse/route.ts (winston logger)
cat << 'SSEPATCH' > patch_sse.js
const fs = require('fs');
let code = fs.readFileSync('src/app/api/repositories/[id]/sse/route.ts', 'utf8');

const importSearch = "import { prisma } from '@/lib/prisma';";
const importReplace = "import { prisma } from '@/lib/prisma';\\nimport { logger } from '@/lib/logger';";
code = code.replace(importSearch, importReplace);

const errorSearch = "console.error('SSE Error:', err);";
const errorReplace = "logger.error('SSE Error:', err);";
code = code.replace(errorSearch, errorReplace);

fs.writeFileSync('src/app/api/repositories/[id]/sse/route.ts', code);
SSEPATCH
node patch_sse.js && rm patch_sse.js

# 8. Update prisma/schema.prisma
cat << 'SCHEMAPATCH' > patch_schema.js
const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

const enumDef = \`
enum PRLabelRuleEvent {
  processing_start
  processing_done
}

model PRLabelRule {\`;

code = code.replace("model PRLabelRule {", enumDef);

const eventSearch = '  event        String     // e.g. "processing_start", "processing_done"';
const eventReplace = '  event        PRLabelRuleEvent';
code = code.replace(eventSearch, eventReplace);

const indexSearch = '  @@index([repositoryId])';
const indexReplace = '  @@index([repositoryId])\\n  @@unique([repositoryId, event, labelName])';
code = code.replace(indexSearch, indexReplace);

fs.writeFileSync('prisma/schema.prisma', code);
SCHEMAPATCH
node patch_schema.js && rm patch_schema.js

export DATABASE_URL="file:./dev.db"
npx prisma db push
