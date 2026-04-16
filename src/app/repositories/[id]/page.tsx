"use client"
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react'

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
  batch_session: any
  processed_comments: any[]
  recent_logs: any[]
}

export default function RepositoryPRsPage() {
  const params = useParams()
  const [prs, setPrs] = useState<PRData[]>([])
  const [repoName, setRepoName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPr, setExpandedPr] = useState<number | null>(null)

  useEffect(() => {
    const fetchPRs = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/repositories/${params.id}/prs`)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to fetch PRs')
        }
        const data = await res.json()
        setRepoName(`${data.repository.owner}/${data.repository.name}`)
        setPrs(data.prs)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPRs()
      const interval = setInterval(fetchPRs, 15000) // Poll every 15s
      return () => clearInterval(interval)
    }
  }, [params.id])

  if (loading && prs.length === 0) {
    return <div className="text-gray-500">Loading Pull Requests...</div>
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-md">Error: {error}</div>
  }

  return (
    <div className="max-w-5xl text-black">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/repositories" className="p-2 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pull Requests</h1>
          <p className="text-gray-500 mt-1">{repoName}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bot Comments</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prs.map(pr => (
              <React.Fragment key={pr.number}>
                <tr className={expandedPr === pr.number ? "bg-gray-50" : "hover:bg-gray-50"}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">#{pr.number} {pr.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                        View on GitHub <ExternalLink size={12} />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pr.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pr.is_batching ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock size={14} /> Batching...
                      </span>
                    ) : pr.recent_logs.length > 0 && pr.recent_logs[0].status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={14} /> Merged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Monitoring
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-1">
                      <MessageCircle size={16} />
                      <span className="font-medium text-gray-900">{pr.comments_count}</span>
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
                    <td colSpan={5} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Comments List */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Locally Processed Bot Comments</h4>
                          {pr.processed_comments.length > 0 ? (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                              {pr.processed_comments.map((comment: any) => (
                                <div key={comment.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm text-sm">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-gray-900">@{comment.author}</span>
                                    <span className="text-xs text-gray-500">{new Date(comment.postedAt).toLocaleString()}</span>
                                  </div>
                                  <p className="text-gray-600 line-clamp-3" title={comment.body}>{comment.body}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No tracked bot comments found for this PR.</p>
                          )}
                        </div>

                        {/* Recent Logs List */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Recent Logs</h4>
                          {pr.recent_logs.length > 0 ? (
                            <div className="space-y-2">
                              {pr.recent_logs.map((log: any) => (
                                <div key={log.id} className="flex gap-2 items-start text-sm">
                                  <div className="mt-0.5">
                                    {log.status === 'SUCCESS' ? <CheckCircle size={14} className="text-green-600" /> : log.status === 'FAILED' ? <XCircle size={14} className="text-red-600" /> : <Clock size={14} className="text-yellow-600" />}
                                  </div>
                                  <div>
                                    <p className="text-gray-900">{log.message}</p>
                                    <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No logs available for this PR.</p>
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
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">No open pull requests found in this repository.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
