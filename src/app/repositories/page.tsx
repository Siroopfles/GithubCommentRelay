"use client"
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, X, Save } from 'lucide-react'

type Repo = {
  id: string
  owner: string
  name: string
  isActive: boolean
  autoMergeEnabled: boolean
  requiredApprovals: number
  requireCI: boolean
  mergeStrategy: string
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
    mergeStrategy: string
  }>({
    defaultValues: {
      autoMergeEnabled: false,
      requiredApprovals: 1,
      requireCI: true,
      mergeStrategy: 'merge'
    }
  })

  // Edit form state
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit } = useForm<Repo>()

  const fetchRepos = async () => {
    const res = await fetch('/api/repositories')
    const data = await res.json()
    setRepos(data)
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
    await fetch(`/api/repositories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentStatus })
    })
    fetchRepos()
  }

  const deleteRepo = async (id: string) => {
    await fetch(`/api/repositories/${id}`, { method: 'DELETE' })
    fetchRepos()
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
          mergeStrategy: data.mergeStrategy
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
    <div className="max-w-4xl text-black">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Tracked Repositories</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Owner (User / Org)</label>
            <input {...register('owner', {required: true})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. microsoft" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
            <input {...register('name', {required: true})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. vscode" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Auto Merge</label>
            <div className="flex items-center h-10">
              <input type="checkbox" {...register('autoMergeEnabled')} className="h-5 w-5 text-blue-600 border-gray-300 rounded" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Req. Approvals</label>
            <input type="number" min="0" {...register('requiredApprovals', { valueAsNumber: true })} className="w-full px-4 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Require CI</label>
            <div className="flex items-center h-10">
              <input type="checkbox" {...register('requireCI')} className="h-5 w-5 text-blue-600 border-gray-300 rounded" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
            <select {...register('mergeStrategy')} className="w-full px-4 py-2 border border-gray-300 rounded-md">
              <option value="merge">Merge</option>
              <option value="squash">Squash</option>
              <option value="rebase">Rebase</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
            Add Repository
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repository</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto Merge</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {repos.map(repo => (
              <tr key={repo.id}>
                {editingId === repo.id ? (
                  <td colSpan={4} className="px-6 py-4 bg-yellow-50">
                    <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-4">
                      <input type="hidden" {...registerEdit('id')} />
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        Editing Settings for: {repo.owner} / {repo.name}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Auto Merge</label>
                          <input type="checkbox" {...registerEdit('autoMergeEnabled')} className="h-5 w-5" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Req. Approvals</label>
                          <input type="number" min="0" {...registerEdit('requiredApprovals', { valueAsNumber: true })} className="w-full px-2 py-1 border rounded" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Require CI</label>
                          <input type="checkbox" {...registerEdit('requireCI')} className="h-5 w-5" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Strategy</label>
                          <select {...registerEdit('mergeStrategy')} className="w-full px-2 py-1 border rounded">
                            <option value="merge">Merge</option>
                            <option value="squash">Squash</option>
                            <option value="rebase">Rebase</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={cancelEdit} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {repo.owner} / {repo.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {repo.autoMergeEnabled ? (
                        <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded">Enabled ({repo.mergeStrategy})</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleActive(repo.id, repo.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${repo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {repo.isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => startEdit(repo)} aria-label={`Edit ${repo.name}`} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deleteRepo(repo.id)} aria-label={`Delete ${repo.name}`} className="text-red-600 hover:text-red-900">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {repos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">No repositories tracked yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
