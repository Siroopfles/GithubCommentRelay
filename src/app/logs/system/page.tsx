"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, RefreshCw } from 'lucide-react'

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isPolling, setIsPolling] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/system/logs')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (e) {
      console.error("Failed to fetch logs")
    }
  }, [])

  useEffect(() => {
    fetchLogs()

    if (isPolling) {
      const interval = setInterval(fetchLogs, 3000) // Poll every 3s
      return () => clearInterval(interval)
    }
  }, [isPolling, fetchLogs])

  useEffect(() => {
     logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="max-w-6xl text-black dark:text-gray-100 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="text-blue-500" />
            System Console Logs
          </h1>

          <button
             onClick={() => setIsPolling(!isPolling)}
             className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${isPolling ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
          >
             <RefreshCw size={16} className={isPolling ? "animate-spin" : ""} />
             {isPolling ? 'Live Polling (3s)' : 'Paused'}
          </button>
      </div>

      <div className="bg-gray-900 text-gray-300 font-mono text-xs p-4 rounded-xl flex-1 overflow-y-auto shadow-inner border border-gray-700">
         {logs.length === 0 ? (
            <div className="text-gray-500 italic">No logs found or empty file...</div>
         ) : (
            logs.map((line, idx) => {
              // Try to parse winston JSON
              try {
                 const parsed = JSON.parse(line);
                 const levelColor = parsed.level === 'error' ? 'text-red-400' : parsed.level === 'warn' ? 'text-yellow-400' : 'text-blue-300';
                 return (
                    <div key={idx} className="mb-1 border-b border-gray-800 pb-1">
                      <span className="text-gray-500 mr-2">[{parsed.timestamp}]</span>
                      <span className={`mr-2 ${levelColor}`}>[{parsed.level?.toUpperCase() || 'INFO'}]</span>
                      <span className="text-gray-200">{parsed.message}</span>
                      {parsed.stack && (
                         <pre className="text-red-300 mt-1 ml-4 border-l-2 border-red-900 pl-2 whitespace-pre-wrap">{parsed.stack}</pre>
                      )}
                    </div>
                 )
              } catch (e) {
                 // Fallback to raw string
                 return <div key={idx} className="mb-1 text-gray-400">{line}</div>
              }
            })
         )}
         <div ref={logsEndRef} />
      </div>
    </div>
  )
}
