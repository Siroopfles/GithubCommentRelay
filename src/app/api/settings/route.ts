import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simplistic mock auth check - in a real app, use next-auth or similar
function isAuthenticated(request: NextRequest) {
  // For a Proxmox local tool, this could check a specific local IP,
  // or check a basic auth header. For now, we'll allow local access but
  // structure it so auth can be easily added.
  return true;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } })

  if (!settings) {
    return NextResponse.json({
      hasGithubToken: false,
      pollingInterval: 60,
      batchDelay: 5,
      hasJulesApiKey: false,
      pruneDays: 60
    })
  }

  return NextResponse.json({
    hasGithubToken: !!settings.githubToken,
    pollingInterval: settings.pollingInterval,
    batchDelay: settings.batchDelay,
      hasJulesApiKey: !!settings.julesApiKey,
    pruneDays: settings.pruneDays,
    githubRateLimitRemaining: settings.githubRateLimitRemaining,
    githubRateLimitReset: settings.githubRateLimitReset
  })
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()

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

    if (data.julesApiKey !== undefined) {
      updateData.julesApiKey = data.julesApiKey === "" ? null : data.julesApiKey;
    }

    if (data.githubToken !== undefined) {
      updateData.githubToken = data.githubToken === '' ? null : data.githubToken;
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        githubToken: data.githubToken === '' || data.githubToken === undefined ? null : data.githubToken,
        pollingInterval: data.pollingInterval,
        batchDelay: data.batchDelay,
        pruneDays: data.pruneDays !== undefined ? data.pruneDays : 60,
        julesApiKey: data.julesApiKey === "" || data.julesApiKey === undefined ? null : data.julesApiKey
      }
    })

    return NextResponse.json({
      hasGithubToken: !!settings.githubToken,
      pollingInterval: settings.pollingInterval,
      batchDelay: settings.batchDelay,
      hasJulesApiKey: !!settings.julesApiKey
    })
  } catch (error) {
    logger.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
