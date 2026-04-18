"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, X, Save, Eye } from 'lucide-react'

type RepoForm = Omit<Repo, "id" | "isActive" | "createdAt">;
type Repo = {
  id: string
  owner: string
  name: string
  isActive: boolean
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
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const { register, handleSubmit, reset } = useForm<{
    owner: string
    name: string
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

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        reset()
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
    resetEdit(repo)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const onSaveEdit = async (data: Repo) => {
    try {
      const res = await fetch(`/api/repositories/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoMergeEnabled: data.autoMergeEnabled,
          requiredApprovals: data.requiredApprovals,
          requireCI: data.requireCI,
          mergeStrategy: data.mergeStrategy,
          taskSourceType: data.taskSourceType,
          taskSourcePath: data.taskSourcePath,
          julesPromptTemplate: data.julesPromptTemplate,
          julesChatForwardMode: data.julesChatForwardMode,
          julesChatForwardDelay: data.julesChatForwardDelay,
          postAggregatedComments: data.postAggregatedComments,
          batchDelay: data.batchDelay,
          branchWhitelist: data.branchWhitelist,
          branchBlacklist: data.branchBlacklist,
          githubToken: data.githubToken,
          requiredBots: data.requiredBots
        })
      })
      if (res.ok) {
        setEditingId(null)
        fetchRepos()
      } else {
        console.error('Failed to update repo:', await res.text())
      }
    } catch (e) {
      console.error('Network error:', e)
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
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="batchDelay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Batch Delay (mins)</label>
            <input id="batchDelay" type="number" min="0" {...register('batchDelay')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Global fallback if empty" />
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
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Repository</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Auto Merge</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {repos.map(repo => (
              <tr key={repo.id}>
                {editingId === repo.id ? (
                  <td colSpan={4} className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20">
                    <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-4">
                      <input type="hidden" {...registerEdit('id')} />
                      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                        Editing Settings for: {repo.owner} / {repo.name}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                        <div>
                          <label htmlFor="editBatchDelay" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Batch Delay (mins)</label>
                          <input id="editBatchDelay" type="number" min="0" {...registerEdit("batchDelay")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" placeholder="Global fallback" />
                        </div>
                        <div>
                          <label htmlFor="editGithubToken" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">GitHub Token</label>
                          <input id="editGithubToken" type="password" {...registerEdit("githubToken")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" placeholder="Global fallback" />
                        </div>
                        <div>
                          <label htmlFor="editBranchWhitelist" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Branch Whitelist</label>
                          <input id="editBranchWhitelist" {...registerEdit("branchWhitelist")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" placeholder="main, develop" />
                        </div>
                        <div>
                          <label htmlFor="editBranchBlacklist" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Branch Blacklist</label>
                          <input id="editBranchBlacklist" {...registerEdit("branchBlacklist")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" placeholder="gh-pages" />
                        </div>
                        <div className="col-span-2">
                          <label htmlFor="editRequiredBots" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Required Bots (Smart Wait)</label>
                          <input id="editRequiredBots" {...registerEdit("requiredBots")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" placeholder="e.g. bot1, bot2" />
                        </div>
                        <div>
                          <label htmlFor="editTaskSourceType" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Task Source</label>
                          <select id="editTaskSourceType" {...registerEdit("taskSourceType")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded">
                            <option value="none">None</option>
                            <option value="local_folder">Local Folder</option>
                            <option value="github_issues">GitHub Issues</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="editTaskSourcePath" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source Path</label>
                          <input id="editTaskSourcePath" {...registerEdit("taskSourcePath")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
                        </div>
                        <div>
                          <label htmlFor="editJulesPromptTemplate" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prompt Template</label>
                          <input id="editJulesPromptTemplate" {...registerEdit("julesPromptTemplate")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
                        </div>
                        <div>
                          <label htmlFor="editJulesChatForwardMode" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Forwarding</label>
                          <select id="editJulesChatForwardMode" {...registerEdit("julesChatForwardMode")} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded">
                            <option value="off">Off</option>
                            <option value="always">Always</option>
                            <option value="failsafe">Failsafe</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="editJulesChatForwardDelay" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Failsafe Delay (min)</label>
                          <input id="editJulesChatForwardDelay" type="number" min="0" {...registerEdit("julesChatForwardDelay", { valueAsNumber: true })} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
                        </div>
                        <div>
                          <label htmlFor="editPostAggregatedComments" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Post PR Comment</label>
                          <input id="editPostAggregatedComments" type="checkbox" {...registerEdit('postAggregatedComments')} className="h-5 w-5" />
                        </div>
                        <div>
                          <label htmlFor="editAutoMergeEnabled" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Auto Merge</label>
                          <label htmlFor="editPostAggregatedComments" className="block text-xs text-gray-500 mb-1">Post PR Comment</label>
                          <input id="editPostAggregatedComments" type="checkbox" {...registerEdit('postAggregatedComments')} className="h-5 w-5" />
                        </div>
                        <div>
                          <label htmlFor="editAutoMergeEnabled" className="block text-xs text-gray-500 mb-1">Auto Merge</label>
                          <input id="editAutoMergeEnabled" type="checkbox" {...registerEdit('autoMergeEnabled')} className="h-5 w-5" />
                        </div>
                        <div>
                          <label htmlFor="editRequiredApprovals" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Req. Approvals</label>
                          <input id="editRequiredApprovals" type="number" min="0" {...registerEdit('requiredApprovals', { valueAsNumber: true })} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
                        </div>
                        <div>
                          <label htmlFor="editRequireCI" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Require CI</label>
                          <input id="editRequireCI" type="checkbox" {...registerEdit('requireCI')} className="h-5 w-5" />
                        </div>
                        <div>
                          <label htmlFor="editMergeStrategy" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Strategy</label>
                          <select id="editMergeStrategy" {...registerEdit('mergeStrategy')} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded">
                            <option value="merge">Merge</option>
                            <option value="squash">Squash</option>
                            <option value="rebase">Rebase</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={cancelEdit} className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded flex items-center gap-1">
                          <X size={14} /> Cancel
                        </button>
                        <button type="submit" className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1">
                          <Save size={14} /> Save
                        </button>
                      </div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {repo.owner} / {repo.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {repo.autoMergeEnabled ? (
                        <span className="text-green-600 dark:text-green-400 font-medium text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Enabled ({repo.mergeStrategy})</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleActive(repo.id, repo.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${repo.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
                      >
                        {repo.isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/repositories/${repo.id}`} aria-label={`View PRs for ${repo.name}`} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mr-4 inline-block align-middle">
                        <Eye size={18} />
                      </Link>
                      <button onClick={() => startEdit(repo)} aria-label={`Edit ${repo.name}`} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-300 mr-4">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deleteRepo(repo.id)} aria-label={`Delete ${repo.name}`} className="text-red-600 hover:text-red-900 dark:hover:text-red-300">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {repos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No repositories tracked yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
