import { prisma } from '@/lib/prisma'
import { CheckCircle2, Clock, GitPullRequest } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [stats, recentComments, activeSessions] = await Promise.all([
    prisma.processedComment.count(),
    prisma.processedComment.findMany({
      orderBy: { processedAt: 'desc' },
      take: 5,
    }),
    prisma.batchSession.findMany({
      where: { isProcessed: false },
      orderBy: { firstSeenAt: 'desc' },
    }),
  ])

  return (
    <div className="space-y-6 text-black dark:text-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Processed Comments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Batch Sessions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeSessions.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Sessions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Pending Batches (Waiting for delay/reviewers)
            </h2>
          </div>
          <div className="p-6">
            {activeSessions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">No active sessions waiting.</p>
            ) : (
              <ul className="space-y-4">
                {activeSessions.map(session => (
                  <li key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <GitPullRequest size={18} className="text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{session.repoOwner}/{session.repoName} #PR-{session.prNumber}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Started: {new Date(session.firstSeenAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">Waiting</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              Recently Processed
            </h2>
          </div>
          <div className="p-6">
            {recentComments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">No comments processed yet.</p>
            ) : (
              <ul className="space-y-4">
                {recentComments.map(comment => (
                  <li key={comment.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {comment.repoOwner}/{comment.repoName} #PR-{comment.prNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Original Author: <span className="font-medium text-gray-700 dark:text-gray-200">{comment.author}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 italic">&quot;{comment.body}&quot;</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
