import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { Octokit } from 'octokit';
import { decrypt } from '@/lib/encryption';
import { verifySession, isAuthenticated } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sessionStore } from '@/lib/sessionStore';



export interface DiagnosticsResults {
    database?: { status: string; message: string };
    directories?: Record<string, { status: string; message: string }>;
    githubToken?: { status: string; message: string };
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }


  const results: DiagnosticsResults = {};

  // 1. Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.database = { status: 'ok', message: 'Connected to SQLite' };
  } catch (e: any) {
    results.database = { status: 'error', message: e.message };
  }

  // 2. Check Write Permissions (Logs & Backups)
  const dirs = ['logs', 'backups'];
  results.directories = {};
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    try {
      if (!fs.existsSync(dirPath)) {
         fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.accessSync(dirPath, fs.constants.W_OK);
      results.directories[dir] = { status: 'ok', message: 'Writable' };
    } catch (e: any) {
      results.directories[dir] = { status: 'error', message: 'Not writable or does not exist' };
    }
  }

  // 3. Check GitHub Token
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings?.githubToken) {

        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');
        const session = await verifySession(settings.sessionSecret!, sessionCookie!.value);
        const encryptionKey = session?.sessionId ? (sessionStore.get(session.sessionId) || null) : null;

        if (encryptionKey) {
            const rawToken = decrypt(settings.githubToken, encryptionKey);
            const octokit = new Octokit({ auth: rawToken });
            const { data } = await octokit.rest.users.getAuthenticated();
            results.githubToken = { status: 'ok', message: `Authenticated as ${data.login}` };
        } else {
             results.githubToken = { status: 'error', message: 'Failed to decrypt token (missing encryption key in session)' };
        }
    } else {
        results.githubToken = { status: 'warning', message: 'No global token configured' };
    }
  } catch (e: any) {
    results.githubToken = { status: 'error', message: e.message || 'API request failed' };
  }

  // 4. Overall status
  const isHealthy = !Object.values(results).some((r: any) =>
      r?.status === 'error'
  ) && (!results.directories || !Object.values(results.directories).some((d: any) => d.status === 'error'));

  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'degraded',
    details: results
  });
}
