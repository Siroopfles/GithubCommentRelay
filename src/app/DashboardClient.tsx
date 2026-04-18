'use client';

import { CheckCircle2, Clock, GitPullRequest, FastForward } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function DashboardClient({
  stats,
  recentComments,
  activeSessions,
  rateLimitRemaining,
  rateLimitReset
}: {
  stats: number,
  recentComments: any[],
  activeSessions: any[],
  rateLimitRemaining: number | null,
  rateLimitReset: string | null
}) {
  const router = useRouter()
  const [triggering, setTriggering] = useState<Record<string, boolean>>({})
  const [showRateLimitBanner, setShowRateLimitBanner] = useState(rateLimitRemaining !== null && rateLimitRemaining < 50);
  const [isPaused, setIsPaused] = useState(rateLimitRemaining !== null && rateLimitRemaining < 10);

  useEffect(() => {
    if (rateLimitReset) {
      const resetTime = new Date(rateLimitReset).getTime();
      const now = Date.now();

      if (now < resetTime) {
        const timeout = setTimeout(() => {
          setShowRateLimitBanner(false);
          setIsPaused(false);
          router.refresh();
        }, resetTime - now);
        return () => clearTimeout(timeout);
      } else {
        setShowRateLimitBanner(false);
        setIsPaused(false);
      }
    }
  }, [rateLimitReset, router]);

  const handleAggregateNow = async (sessionId: string) => {
    setTriggering(prev => ({ ...prev, [sessionId]: true }))
    try {
      const res = await fetch('/api/trigger-aggregation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!res.ok) {
        throw new Error('Failed to trigger')
      }

      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setTriggering(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  return (
    <div className="space-y-6 text-black dark:text-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {showRateLimitBanner && (
        <div className={`p-4 mb-6 rounded-md border flex items-center gap-3 ${(rateLimitRemaining ?? 0) < 10 ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'}`}>
          <Clock size={20} className="flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">
              GitHub API Rate Limit Warning
            </p>
            <p className="text-xs mt-1">
              {rateLimitRemaining ?? 0} requests remaining.
              {isPaused ? ' The bot is currently paused.' : ''}
              Limits will reset at {rateLimitReset ? new Date(rateLimitReset).toLocaleTimeString() : 'unknown time'}.
            </p>
          </div>
        </div>
      )}


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
              Pending Batches (Waiting for delay)
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
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">Waiting</span>
                      <button
                        onClick={() => handleAggregateNow(session.id)}
                        disabled={triggering[session.id]}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                        title="Skip delay and aggregate immediately"
                      >
                        <FastForward size={14} />
                        {triggering[session.id] ? 'Triggering...' : 'Aggregate Now'}
                      </button>
                    </div>
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
