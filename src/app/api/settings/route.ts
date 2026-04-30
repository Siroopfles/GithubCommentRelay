import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption';
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

export async function GET(request: NextRequest) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })

  if (!settings) {
    return NextResponse.json({
      hasGithubToken: false,
      pollingInterval: 60,
      batchDelay: 5,
      hasJulesApiKey: false,
      pruneDays: 60,
      githubRateLimitRemaining: null,
      githubRateLimitReset: null,
      hasWebhookSecret: false
    })
  }

  return NextResponse.json({
    hasGithubToken: !!settings.githubToken,
    pollingInterval: settings.pollingInterval,
    batchDelay: settings.batchDelay,
    hasJulesApiKey: !!settings.julesApiKey,
    pruneDays: settings.pruneDays,
    githubRateLimitRemaining: settings.githubRateLimitRemaining,
    githubRateLimitReset: settings.githubRateLimitReset,
    hasWebhookSecret: !!settings.webhookSecret
  })
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const encryptionKey = await getEncryptionKey();

    // Validate
    if (data.githubToken !== undefined && typeof data.githubToken !== 'string') {
      return NextResponse.json({ error: 'githubToken must be a string' }, { status: 400 })
    }
    if (typeof data.pollingInterval !== 'number' || !Number.isInteger(data.pollingInterval) || data.pollingInterval <= 0) {
      return NextResponse.json({ error: 'pollingInterval must be a positive integer' }, { status: 400 })
    }
    if (data.pruneDays !== undefined && (typeof data.pruneDays !== 'number' || !Number.isInteger(data.pruneDays) || data.pruneDays <= 0)) {
      return NextResponse.json({ error: 'pruneDays must be a positive integer' }, { status: 400 })
    }
    if (typeof data.batchDelay !== 'number' || !Number.isInteger(data.batchDelay) || data.batchDelay <= 0) {
      return NextResponse.json({ error: 'batchDelay must be a positive integer' }, { status: 400 })
    }
    if (data.julesApiKey !== undefined && typeof data.julesApiKey !== "string") {
      return NextResponse.json({ error: "julesApiKey must be a string" }, { status: 400 })
    }

    const updateData: any = {
      pollingInterval: data.pollingInterval,
      batchDelay: data.batchDelay,
      pruneDays: data.pruneDays !== undefined ? data.pruneDays : 60,
    }

    if (data.webhookSecret !== undefined) {
      if (typeof data.webhookSecret !== "string") {
        return NextResponse.json({ error: "webhookSecret must be a string" }, { status: 400 });
      }
      updateData.webhookSecret = data.webhookSecret === "" ? null : data.webhookSecret;
    }

    if (data.julesApiKey !== undefined) {
      updateData.julesApiKey = data.julesApiKey === "" ? null : data.julesApiKey;
    }

    if (data.githubToken !== undefined) {
      if (data.githubToken === '') {
        updateData.githubToken = null;
      } else {
        if (!encryptionKey) return NextResponse.json({ error: 'Unauthorized to encrypt tokens. Please log in again.' }, { status: 401 });
        updateData.githubToken = encrypt(data.githubToken, encryptionKey);
      }
    }

    const redact = (obj: any) => {
      const SENSITIVE = ['githubToken', 'julesApiKey', 'webhookSecret'];
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = SENSITIVE.includes(k)
          ? (v == null || v === '' ? null : '[REDACTED]')
          : v;
      }
      return out;
    };

    const [auditLog, settings] = await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          action: 'UPDATE_SETTINGS',
          entity: 'Settings',
          details: JSON.stringify(redact(updateData)),
        },
      }),
      prisma.settings.upsert({
        where: { id: 1 },
        update: updateData,
        create: {
          id: 1,
          githubToken: updateData.githubToken || null,
          pollingInterval: data.pollingInterval,
          batchDelay: data.batchDelay,
          pruneDays: updateData.pruneDays,
          julesApiKey: updateData.julesApiKey || null,
          webhookSecret: updateData.webhookSecret || null
        }
      })
    ]);

    return NextResponse.json({
      hasGithubToken: !!settings.githubToken,
      pollingInterval: settings.pollingInterval,
      batchDelay: settings.batchDelay,
      hasJulesApiKey: !!settings.julesApiKey,
      pruneDays: settings.pruneDays,
      githubRateLimitRemaining: settings.githubRateLimitRemaining,
      githubRateLimitReset: settings.githubRateLimitReset,
      hasWebhookSecret: !!settings.webhookSecret
    })
  } catch (error) {
    logger.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
