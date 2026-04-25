"use client"
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, X, Save, Eye, Settings } from 'lucide-react'

type RepoForm = Omit<Repo, "id" | "isActive" | "createdAt">;
type Repo = {
  id: string
  owner: string
  name: string
  groupName?: string
  isActive: boolean
  autoMergeEnabled: boolean
  requiredApprovals: number
  requireCI: boolean
  mergeStrategy: 'merge' | 'squash' | 'rebase'
  taskSourceType: string
  taskSourcePath?: string | null
  julesPromptTemplate?: string | null
  julesChatForwardMode: string
  julesChatForwardDelay: number
  aiSystemPrompt?: string | null
  commentTemplate?: string | null
  postAggregatedComments: boolean
  batchDelay?: number | null
  branchWhitelist?: string | null
  branchBlacklist?: string | null
  githubToken?: string | null
  hasGithubToken?: boolean
  maxConcurrentTasks: number
  requiredBots?: string | null
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const { register, handleSubmit, reset } = useForm<{
    owner: string
    name: string
    groupName?: string
    autoMergeEnabled: boolean
    requiredApprovals: number
    requireCI: boolean
    mergeStrategy: 'merge' | 'squash' | 'rebase'
    taskSourceType: string
    taskSourcePath?: string
    julesPromptTemplate?: string
    julesChatForwardMode: string
    julesChatForwardDelay: number
    postAggregatedComments: boolean
    batchDelay?: number | null
    branchWhitelist?: string | null
    branchBlacklist?: string | null
    githubToken?: string | null
    requiredBots?: string | null
  }>({
    defaultValues: {
      autoMergeEnabled: false,
      requiredApprovals: 1,
      requireCI: true,
      mergeStrategy: 'merge',
      postAggregatedComments: true
    }
  })

  // Edit form state
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit } = useForm<Repo>()

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repositories')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setRepos(data)
        } else {
          console.error('Invalid data format received:', data)
          setRepos([])
        }
      } else {
        console.error('Failed to fetch repos:', await res.text())
        setRepos([])
      }
    } catch (e) {
      console.error('Network error fetching repos:', e)
      setRepos([])
    }
  }

  useEffect(() => {
    fetchRepos()
  }, [])


  // Group repositories by groupName (alphabetical, "Default" first)
  const groupedRepos = useMemo(() => {
    const map = repos.reduce((acc, repo) => {
      const group = repo.groupName || 'Default';
      (acc[group] ||= []).push(repo);
      return acc;
    }, {} as Record<string, Repo[]>);
    return Object.fromEntries(
      Object.entries(map).sort(([a], [b]) =>
        a === 'Default' ? -1 : b === 'Default' ? 1 : a.localeCompare(b)
      )
    );
  }, [repos]);

  const toggleGroup = (group: string) => {
    // expanded-by-default: undefined and true both mean expanded
    setExpandedGroups(prev => ({ ...prev, [group]: prev[group] === false }));
  };

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        reset({ githubToken: "" })
        fetchRepos()
      } else {
        console.error('Failed to add repo:', await res.text())
      }
    } catch (e) {
      console.error('Network error:', e)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/repositories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      if (res.ok) {
        fetchRepos()
      } else {
        console.error('Failed to toggle active status:', await res.text())
      }
    } catch (e) {
      console.error('Network error toggling status:', e)
    }
  }

  const deleteRepo = async (id: string) => {
    try {
      const res = await fetch(`/api/repositories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchRepos()
      } else {
        console.error('Failed to delete repository:', await res.text())
      }
    } catch (e) {
      console.error('Network error deleting repo:', e)
    }
  }

  const startEdit = (repo: Repo) => {
    setEditingId(repo.id)
    resetEdit({ ...repo, githubToken: "" })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

const onSaveEdit = async (data: Repo) => {
    if (!editingId) return
    const repo = repos.find(r => r.id === editingId)
    if (!repo) return

const updateData: Record<string, unknown> = {
      owner: data.owner,
      name: data.name,
      groupName: data.groupName,
      isActive: data.isActive,
    };
    if (data.githubToken) updateData.githubToken = data.githubToken;

    try {
      const res = await fetch(`/api/repositories/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        setEditingId(null);
        fetchRepos();
      } else {
        console.error('Failed to update repository');
      }
    } catch (e) {
      console.error('Network error:', e);
    }
  }

  return (
    <div className="max-w-4xl text-black dark:text-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Tracked Repositories</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Owner (User / Org)</label>
            <input id="owner" {...register('owner', {required: true})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. microsoft" />
          </div>
<div className="flex-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repository Name</label>
            <input id="name" {...register('name', {required: true})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. vscode" />
          </div>
          <div className="flex-1">
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group / Folder</label>
            <input id="groupName" {...register('groupName')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Default" />
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="batchDelay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Batch Delay (mins)</label>
            <input id="batchDelay" type="number" min="0" {...register('batchDelay', { valueAsNumber: true, setValueAs: v => (v === '' || Number.isNaN(v) ? null : v) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Global fallback if empty" />
          </div>
          <div>
            <label htmlFor="githubToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repository GitHub Token</label>
            <input id="githubToken" type="password" {...register('githubToken')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Global fallback if empty" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="branchWhitelist" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch Whitelist (comma-separated)</label>
            <input id="branchWhitelist" {...register('branchWhitelist')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. main, develop" />
            <p className="text-xs text-gray-500 mt-1">Only aggregate on these target branches (leave empty for all).</p>
          </div>
          <div>
            <label htmlFor="branchBlacklist" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch Blacklist (comma-separated)</label>
            <input id="branchBlacklist" {...register('branchBlacklist')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. gh-pages" />
            <p className="text-xs text-gray-500 mt-1">Skip aggregation on these target branches.</p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="requiredBots" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required Bots (Smart Wait)</label>
          <input id="requiredBots" {...register('requiredBots')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. dependabot[bot], sonarcloud[bot]" />
          <p className="text-xs text-gray-500 mt-1">Wait until ALL these bots have commented before posting (comma-separated). Max wait time: 30 mins.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <label htmlFor="taskSourceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jules Task Source</label>
            <select id="taskSourceType" {...register("taskSourceType")} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md">
              <option value="none">None</option>
              <option value="local_folder">Local Folder</option>
              <option value="github_issues">GitHub Issues</option>
            </select>
          </div>
          <div>
            <label htmlFor="taskSourcePath" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Path (Folder)</label>
            <input id="taskSourcePath" {...register("taskSourcePath")} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" placeholder="e.g. docs/tasks/" />
          </div>
          <div>
            <label htmlFor="julesPromptTemplate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt Template</label>
            <input id="julesPromptTemplate" {...register("julesPromptTemplate")} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" placeholder="{{task_title}}" />
          </div>
          <div>
            <label htmlFor="julesChatForwardMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comment Forwarding</label>
            <select id="julesChatForwardMode" {...register("julesChatForwardMode")} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md">
              <option value="off">Off</option>
              <option value="always">Always</option>
              <option value="failsafe">Failsafe (Delay)</option>
            </select>
          </div>
          <div>
            <label htmlFor="julesChatForwardDelay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Failsafe Delay (min)</label>
            <input id="julesChatForwardDelay" type="number" min="0" {...register("julesChatForwardDelay", { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <label htmlFor="autoMergeEnabled" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto Merge</label>
            <div className="flex items-center h-10">
              <input id="autoMergeEnabled" type="checkbox" {...register('autoMergeEnabled')} className="h-5 w-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded" />
            </div>
          </div>
          <div>
            <label htmlFor="requiredApprovals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Req. Approvals</label>
            <input id="requiredApprovals" type="number" min="0" {...register('requiredApprovals', { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" />
          </div>
          <div>
            <label htmlFor="requireCI" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Require CI</label>
            <div className="flex items-center h-10">
              <input id="requireCI" type="checkbox" {...register('requireCI')} className="h-5 w-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded" />
            </div>
          </div>
          <div>
            <label htmlFor="mergeStrategy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Strategy</label>
            <select id="mergeStrategy" {...register('mergeStrategy')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md">
              <option value="merge">Merge</option>
              <option value="squash">Squash</option>
              <option value="rebase">Rebase</option>
            </select>
          </div>
          <div>
            <label htmlFor="postAggregatedComments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Post PR Comment</label>
            <div className="flex items-center h-10">
              <input id="postAggregatedComments" type="checkbox" {...register('postAggregatedComments')} className="h-5 w-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
            Add Repository
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

        <div className="space-y-4">
          {Object.entries(groupedRepos).map(([groupName, groupRepos]) => {
            const isExpanded = expandedGroups[groupName] !== false;
            return (
              <div key={groupName} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  type="button"
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{groupName}</span>
                    <span className="bg-gray-200 dark:bg-gray-700 text-xs py-0.5 px-2 rounded-full">{groupRepos.length}</span>
                  </div>
                  <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {isExpanded && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-white dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repository</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto-Merge</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jules Chat</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {groupRepos.map(repo => (
                        editingId === repo.id ? (
                          <tr key={repo.id}>
                            <td colSpan={6} className="px-6 py-4">
                              <form onSubmit={handleSubmitEdit(onSaveEdit)}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner (User / Org)</label>
                                    <input {...registerEdit('owner', { required: true })} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repository Name</label>
                                    <input {...registerEdit('name', { required: true })} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
                                  </div>
<div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group / Folder</label>
                                    <input {...registerEdit('groupName')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" placeholder="e.g. Work, Open Source" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Token (Leave empty to keep)</label>
                                    <input {...registerEdit('githubToken')} type="password" placeholder="ghp_..." className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
                                  </div>
                                  <div className="flex items-center mt-6">

                                      <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" {...registerEdit('isActive')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                                      </label>
                                  </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                  <button type="button" onClick={cancelEdit} className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"><Save size={18}/> Save Changes</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        ) : (
                        <tr key={repo.id}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">
                            {repo.owner}/{repo.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleActive(repo.id, repo.isActive)}
                              className={`px-2 py-1 rounded text-xs font-medium ${repo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                            >
                              {repo.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {repo.autoMergeEnabled ? 'Enabled' : 'Disabled'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {repo.taskSourceType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {repo.julesChatForwardMode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                            <button onClick={() => startEdit(repo)} aria-label={`Edit ${repo.owner}/${repo.name}`} type="button" className="text-blue-600 hover:text-blue-900"><Edit2 size={18}/></button>
                            <button onClick={() => deleteRepo(repo.id)} aria-label={`Delete ${repo.owner}/${repo.name}`} type="button" className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                            <Link href={`/repositories/${repo.id}`} aria-label={`Settings for ${repo.owner}/${repo.name}`} className="text-gray-600 hover:text-gray-900"><Settings size={18}/></Link>
                          </td>
                        </tr>
                      ) ) )}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {repos.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl">
              No repositories added yet.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
