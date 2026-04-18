"use client"
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

type LogEntry = {
  id: string
  repoOwner: string
  repoName: string
  prNumber: number
  status: string
  message: string | null
  createdAt: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const fetchLogs = async () => {
    const res = await fetch('/api/logs')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setLogs(data)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-4xl text-black dark:text-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Auto-Merge Logs</h1>
      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Repository / PR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 dark:text-gray-100 divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map(log => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {log.repoOwner}/{log.repoName} # {log.prNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {log.status === 'SUCCESS' && (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><CheckCircle size={16}/> Success</span>
                  )}
                  {log.status === 'FAILED' && (
                    <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><XCircle size={16}/> Failed</span>
                  )}
                  {log.status === 'SKIPPED' && (
                    <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium"><XCircle size={16}/> Skipped</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {log.message || '-'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No auto-merge events logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
