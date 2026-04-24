"use client"
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, MessageCircle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface BatchSession {
  id: string
  prNumber: number
  repoOwner: string
  repoName: string
  firstSeenAt: string
  isProcessed: boolean
  isProcessing: boolean
  includeCheckRuns: boolean
  isPaused?: boolean
  hasConflict?: boolean
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
  const [aiBotUsernames, setAiBotUsernames] = useState('')
  const [regressionDetection, setRegressionDetection] = useState(true)
  const [regressionMatchMode, setRegressionMatchMode] = useState('exact')
  const [infiniteLoopThreshold, setInfiniteLoopThreshold] = useState(3)
  const [maxDiffLines, setMaxDiffLines] = useState(500)
  const [complexityWeights, setComplexityWeights] = useState('')
  interface PromptTemplate { id: string; repositoryId: string; name: string; isActive: boolean; systemPrompt: string | null; template: string; createdAt: string; }
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [newPromptName, setNewPromptName] = useState('')
  const [newPromptTemplate, setNewPromptTemplate] = useState('')

  const fetchPrompts = async (repoId: string) => {
    try {
      const res = await fetch(`/api/repositories/${repoId}/prompts`)
      if (res.ok) setPrompts((await res.json()) as PromptTemplate[])
    } catch (e) { console.error('Failed to fetch prompts', e) }
  }

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
      const events = new EventSource(`/api/repositories/${params.id}/sse`);
      events.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'sessions') {
            setPrs((current) =>
              current.map((pr) => {
                const activeSseSession = payload.data.find((s: BatchSession) => s.prNumber === pr.number);
                // If there's an active session from SSE, use it.
                // If not, but we had one locally that was active, it means it just finished processing (dropped from SSE),
                // so we update it to isProcessed = true.
                const newSession = activeSseSession || (pr.batch_session ? { ...pr.batch_session, isProcessed: true, isProcessing: false } : undefined);
                return {
                  ...pr,
                  batch_session: newSession,
                  is_batching: newSession && !newSession.isProcessed ? true : false
                };
              })
            );
            setError(null);
          }
        } catch (e) {
          console.error('Failed to parse SSE', e);
        }
      };
      events.onerror = () => {
        setError('Lost live update connection');
      };

      const interval = setInterval(fetchPRs, 30000); // Slower polling for comments/logs

      return () => {
        events.close();
        clearInterval(interval);
      };
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
        <Link href="/repositories" className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
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
                    <div className="flex gap-2">
                      {pr.is_batching && (
                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                           <Clock size={14} /> Batching...
                         </span>
                      )}
                      {pr.batch_session?.hasConflict ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300" title="A human interacted with this PR while Jules was active.">
                          ⚠️ Conflict
                        </span>
                      ) : pr.batch_session?.isPaused ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                          ⏸ Paused
                        </span>
                      ) : (!pr.is_batching && pr.recent_logs.length > 0 && pr.recent_logs[0].status === 'FAILED') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          <XCircle size={14} /> Merge Failed
                        </span>
                      ) : (!pr.is_batching) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                          Monitoring
                        </span>
                      ) : null}
                    </div>

                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <MessageCircle size={16} />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{pr.comments_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-3">
                    {pr.batch_session && !pr.batch_session.isPaused && !pr.batch_session.isProcessed && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch(`/api/batch-sessions/${pr.batch_session?.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isPaused: true })
                            });
                            if (!res.ok) {
                              const { error: msg } = await res.json().catch(() => ({ error: 'Failed to pause Jules' }));
                              setError(msg || 'Failed to pause Jules');
                            } else {
                              setPrs(current => current.map(p => p.number === pr.number && p.batch_session ? { ...p, batch_session: { ...p.batch_session, isPaused: true } } : p));
                            }
                          } catch (err) {
                            console.error(err);
                            setError(err instanceof Error ? err.message : 'Failed to pause Jules');
                          }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 flex items-center gap-1 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 px-2 py-1 rounded"
                        title="Pauzeer AI"
                      >
                        <XCircle size={14} /> Stop Jules
                      </button>
                    )}
                    {pr.batch_session && pr.batch_session.isPaused && !pr.batch_session.isProcessed && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch(`/api/batch-sessions/${pr.batch_session?.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isPaused: false })
                            });
                            if (!res.ok) {
                              const { error: msg } = await res.json().catch(() => ({ error: 'Failed to resume Jules' }));
                              setError(msg || 'Failed to resume Jules');
                            } else {
                              setPrs(current => current.map(p => p.number === pr.number && p.batch_session ? { ...p, batch_session: { ...p.batch_session, isPaused: false, hasConflict: false } } : p));
                            }
                          } catch (err) {
                            console.error(err);
                            setError(err instanceof Error ? err.message : 'Failed to resume Jules');
                          }
                        }}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 flex items-center gap-1 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 px-2 py-1 rounded"
                        title="Hervat AI"
                      >
                        <CheckCircle size={14} /> Resume Jules
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedPr(expandedPr === pr.number ? null : pr.number)}
                      className="text-blue-600 hover:text-blue-900 ml-2"
                    >
                      {expandedPr === pr.number ? 'Hide Details' : 'Show Details'}
                    </button>
                  </td>
                </tr>
                {expandedPr === pr.number && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Conversation History (Combined Bot Comments & Jules Logs) */}
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2 flex justify-between items-center">
                            <span>Conversation History (Bots vs Jules)</span>
                          </h4>
                          {(() => {
                             const combined = [
                               ...pr.processed_comments.map((c: any) => ({ ...c, type: 'comment', time: new Date(c.postedAt).getTime() })),
                               ...pr.recent_logs.map((l: any) => ({ ...l, type: 'log', time: new Date(l.createdAt).getTime() }))
                             ].sort((a, b) => a.time - b.time);

                             if (combined.length === 0) {
                               return <p className="text-sm text-gray-500 dark:text-gray-400 italic">No activity recorded for this PR.</p>;
                             }

                             return (
                               <div className="space-y-4 max-h-96 overflow-y-auto pr-2 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-gray-600 before:to-transparent">
                                 {combined.map((item: any, idx: number) => {
                                    if (item.type === 'comment') {
                                        return (
                                          <div key={`c-${item.id}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-red-100 dark:bg-red-900/30 text-red-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                                                 <MessageCircle size={16} />
                                              </div>
                                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                                                  <div className="flex justify-between items-center mb-1">
                                                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">@{item.author} (CI Bot)</span>
                                                      <span className="text-xs text-gray-500">{new Date(item.time).toLocaleTimeString()}</span>
                                                  </div>
                                                  <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-3">{item.body}</p>
                                              </div>
                                          </div>
                                        )
                                    } else {
                                        return (
                                          <div key={`l-${item.id}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-blue-100 dark:bg-blue-900/30 text-blue-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                                                 {item.status === 'SUCCESS' ? <CheckCircle size={16} className="text-green-500" /> : (item.status === 'FAILED' ? <XCircle size={16} className="text-red-500" /> : <Clock size={16} />)}
                                              </div>
                                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
                                                  <div className="flex justify-between items-center mb-1">
                                                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Jules Relay Worker</span>
                                                      <span className="text-xs text-gray-500">{new Date(item.time).toLocaleTimeString()}</span>
                                                  </div>
                                                  <p className="text-gray-600 dark:text-gray-400 text-xs">{item.message}</p>
                                              </div>
                                          </div>
                                        )
                                    }
                                 })}
                               </div>
                             );
                          })()}
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
