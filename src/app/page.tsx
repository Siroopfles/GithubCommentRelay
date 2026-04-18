import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [stats, recentComments, activeSessions, settings] = await Promise.all([
    prisma.processedComment.count(),
    prisma.processedComment.findMany({
      orderBy: { processedAt: 'desc' },
      take: 5,
    }),
    prisma.batchSession.findMany({
      where: { isProcessed: false },
      orderBy: { firstSeenAt: 'desc' },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ])

  return <DashboardClient stats={stats} recentComments={recentComments} activeSessions={activeSessions} rateLimitRemaining={settings?.rateLimitRemaining ?? null} rateLimitReset={settings?.rateLimitReset ?? null} />
}
