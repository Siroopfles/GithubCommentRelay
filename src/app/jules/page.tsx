'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';


function JulesDashboardContent() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('session');

  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const didAutoSelectRef = useRef(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (initialSessionId && tasks.length > 0) {
      const task = tasks.find(t => t.julesSessionId === initialSessionId);
      if (task) {
        didAutoSelectRef.current = true;
        handleSelectTask(task);
      }
    }
  }, [initialSessionId, tasks]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/jules/sessions?status=all');
      if (res.ok) {
         const allJulesTasks = await res.json();
         setTasks(allJulesTasks);
         return;
      }

      // Fallback to old behavior if endpoint doesn't exist
      const reposRes = await fetch('/api/repositories');
      const repos = await reposRes.json();

      const repoTasksPromises = repos.map(async (repo: any) => {
        const tasksRes = await fetch(`/api/tasks?repositoryId=${repo.id}`);
        const repoTasks = await tasksRes.json();
        const julesTasks = repoTasks.filter((t: any) => t.julesSessionId);
        return julesTasks.map((t: any) => ({ ...t, repoName: repo.name, repoOwner: repo.owner }));
      });
      const allJulesTasksResults = await Promise.all(repoTasksPromises);
      setTasks(allJulesTasksResults.flat());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTask = async (task: any) => {
    setSelectedTask(task);
    if (!task.julesSessionId) return;

    try {
      setSessionDetails(null);
      setActivities([]);
      const res = await fetch(`/api/jules/sessions/${task.julesSessionId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSessionDetails(data.session);
      setActivities(data.activities?.activities || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprovePlan = async () => {
    if (!selectedTask?.julesSessionId) return;
    try {
      setIsSending(true);
      const res = await fetch(`/api/jules/sessions/${selectedTask.julesSessionId}/approve`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error(await res.text());
      // Refresh
      handleSelectTask(selectedTask);
    } catch (err: any) {
      alert(`Failed to approve: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedTask?.julesSessionId) return;

    try {
      setIsSending(true);
      const res = await fetch(`/api/jules/sessions/${selectedTask.julesSessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage('');
      // Refresh
      handleSelectTask(selectedTask);
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Sidebar for tasks */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Jules Sessions</h2>
          <button onClick={fetchTasks} className="text-sm text-blue-600 hover:text-blue-800">Refresh</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-gray-500">No active Jules sessions found.</div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  aria-pressed={selectedTask?.id === task.id}
                  className={`w-full text-left p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${selectedTask?.id === task.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-1 flex justify-between">
                    <span>{task.repoOwner}/{task.repoName}</span>
                    <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{task.julesSessionState || 'Unknown'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content for session details */}
      <div className="flex-1 flex flex-col h-full">
        {selectedTask ? (
          <>
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedTask.title}</h1>
                <div className="text-sm text-gray-600 dark:text-gray-400 flex gap-4">
                  <span>Session: {selectedTask.julesSessionId}</span>
                  <span>State: <span className="font-medium">{sessionDetails?.state || selectedTask.julesSessionState}</span></span>
                  {selectedTask.prNumber && <span>PR: #{selectedTask.prNumber}</span>}
                  {sessionDetails?.url && <a href={sessionDetails.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View in Jules UI</a>}
                </div>
              </div>
              <button onClick={() => handleSelectTask(selectedTask)} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">Refresh Data</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50">
              {activities.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">No activities found for this session yet.</div>
              ) : (
                <div className="space-y-6">
                  {activities.map((activity, index) => (
                    <div key={activity.id || index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold uppercase text-gray-500">{activity.originator || 'System'}</span>
                        <span className="text-xs text-gray-400">{new Date(activity.createTime).toLocaleString()}</span>
                      </div>

                      {activity.agentMessaged && (
                        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{activity.agentMessaged.agentMessage}</div>
                      )}

                      {activity.userMessaged && (
                        <div className="text-blue-800 dark:text-blue-300 whitespace-pre-wrap bg-blue-50 dark:bg-blue-900/20 p-3 rounded">{activity.userMessaged.userMessage}</div>
                      )}

                      {activity.planGenerated && (
                        <div>
                          <h4 className="font-medium mb-2 text-purple-700 dark:text-purple-400">Plan Generated</h4>
                          <ul className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            {activity.planGenerated.plan?.steps?.map((step: any, i: number) => (
                              <li key={step.id || i}>
                                <strong>{step.title}</strong>
                                {step.description && <p className="text-gray-500 text-xs mt-0.5">{step.description}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activity.bashOutput && (
                        <div className="mt-2">
                          <div className="text-xs font-mono bg-gray-900 text-gray-300 p-2 rounded-t rounded-b-none border border-gray-700">$ {activity.bashOutput.command}</div>
                          {activity.bashOutput.output && (
                             <pre className="text-xs font-mono bg-black text-gray-400 p-3 rounded-b border border-t-0 border-gray-700 overflow-x-auto max-h-40">{activity.bashOutput.output}</pre>
                          )}
                        </div>
                      )}

                      {activity.description && !activity.agentMessaged && !activity.userMessaged && !activity.planGenerated && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 italic">{activity.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {sessionDetails?.state === 'AWAITING_PLAN_APPROVAL' && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/30 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">The agent is waiting for plan approval.</span>
                  <button
                    onClick={handleApprovePlan}
                    disabled={isSending}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-md text-sm disabled:opacity-50"
                  >
                    Approve Plan
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Send a message to the Jules agent..."
                  className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isSending || sessionDetails?.state === 'COMPLETED' || sessionDetails?.state === 'FAILED'}
                />
                <button
                  type="submit"
                  disabled={isSending || !message.trim() || sessionDetails?.state === 'COMPLETED' || sessionDetails?.state === 'FAILED'}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a task from the sidebar to view its Jules session details.
          </div>
        )}
      </div>
    </div>
  );
}

export default function JulesDashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-500">Loading Jules Dashboard...</div>}>
      <JulesDashboardContent />
    </Suspense>
  );
}
