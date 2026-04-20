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
