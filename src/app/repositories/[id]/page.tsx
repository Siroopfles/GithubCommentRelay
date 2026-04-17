"use client"
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react'

interface BatchSession {
  id: string
  prNumber: number
  repoOwner: string
  repoName: string
  firstSeenAt: string
  isProcessed: boolean
  isProcessing: boolean
}

interface ProcessedComment {
  id: string
  author: string
  postedAt: string
  body: string
}

interface RecentLog {
  id: string
  status: string
  message: string | null
  createdAt: string
}

type PRData = {
  number: number
  title: string
  author: string
  state: string
  html_url: string
  created_at: string
  updated_at: string
  comments_count: number
  is_batching: boolean
  batch_session: BatchSession | null
  processed_comments: ProcessedComment[]
  recent_logs: RecentLog[]
}

export default function RepositoryPRsPage() {
  const params = useParams()
  const [prs, setPrs] = useState<PRData[]>([])
  const [repoName, setRepoName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [expandedPr, setExpandedPr] = useState<number | null>(null)

  useEffect(() => {
    const fetchPRs = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/repositories/${params.id}/prs`)
        if (!res.ok) {
          let errMsg = 'Failed to fetch PRs'
          const resClone = res.clone()
          try {
            const errData = await res.json()
            errMsg = errData.error || errMsg
          } catch {
            const errText = await resClone.text()
            errMsg = errText || errMsg
          }
          throw new Error(errMsg)
        }
        const data = await res.json()
        setRepoName(`${data.repository.owner}/${data.repository.name}`)
        setPrs(data.prs)
        setError(null)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('An unknown error occurred')
        }
      } finally {
        setLoading(false)
        setIsInitialLoad(false)
      }
    }

    if (params.id) {
      fetchPRs()
      const interval = setInterval(fetchPRs, 15000) // Poll every 15s
      return () => clearInterval(interval)
    }
  }, [params.id])

  if (isInitialLoad && loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading Pull Requests...</div>
  }

  // Removed blocking error state to allow background polling to recover

  return (
    <div className="max-w-5xl text-black dark:text-gray-100">
      {error && <div className="text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-md mb-4 flex justify-between items-center">
        <span>Error fetching updates: {error}</span>
        <button onClick={() => setError(null)} className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium">Dismiss</button>
      </div>}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/repositories" className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pull Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{repoName}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bot Comments</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {prs.map(pr => (
              <React.Fragment key={pr.number}>
                <tr className={expandedPr === pr.number ? "bg-gray-50 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-700"}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">#{pr.number} {pr.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                        View on GitHub <ExternalLink size={12} />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {pr.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pr.is_batching ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        <Clock size={14} /> Batching...
                      </span>
                    ) : pr.recent_logs.length > 0 && pr.recent_logs[0].status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                        <XCircle size={14} /> Merge Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        Monitoring
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <MessageCircle size={16} />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{pr.comments_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setExpandedPr(expandedPr === pr.number ? null : pr.number)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {expandedPr === pr.number ? 'Hide Details' : 'Show Details'}
                    </button>
                  </td>
                </tr>
                {expandedPr === pr.number && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Comments List */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">Locally Processed Bot Comments</h4>
                          {pr.processed_comments.length > 0 ? (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                              {pr.processed_comments.map((comment: ProcessedComment) => (
                                <div key={comment.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm text-sm">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">@{comment.author}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.postedAt).toLocaleString()}</span>
                                  </div>
                                  <p className="text-gray-600 dark:text-gray-400 line-clamp-3" title={comment.body}>{comment.body}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No tracked bot comments found for this PR.</p>
                          )}
                        </div>

                        {/* Recent Logs List */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">Recent Logs</h4>
                          {pr.recent_logs.length > 0 ? (
                            <div className="space-y-2">
                              {pr.recent_logs.map((log: RecentLog) => (
                                <div key={log.id} className="flex gap-2 items-start text-sm">
                                  <div className="mt-0.5">
                                    {log.status === 'SUCCESS' ? <CheckCircle size={14} className="text-green-600" /> : log.status === 'FAILED' ? <XCircle size={14} className="text-red-600" /> : <Clock size={14} className="text-yellow-600" />}
                                  </div>
                                  <div>
                                    <p className="text-gray-900 dark:text-gray-100">{log.message}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No logs available for this PR.</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {prs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No open pull requests found in this repository.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
