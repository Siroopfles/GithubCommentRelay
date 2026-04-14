"use client"
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2 } from 'lucide-react'

type Repo = { id: string, owner: string, name: string, isActive: boolean }

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const { register, handleSubmit, reset } = useForm<{owner: string, name: string}>()

  const fetchRepos = async () => {
    const res = await fetch('/api/repositories')
    const data = await res.json()
    setRepos(data)
  }

  useEffect(() => {
    fetchRepos()
  }, [])

  const onSubmit = async (data: {owner: string, name: string}) => {
    await fetch('/api/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    reset()
    fetchRepos()
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

  return (
    <div className="max-w-3xl text-black">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Tracked Repositories</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-end mb-8">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Owner (User / Org)</label>
          <input {...register('owner', {required: true})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. microsoft" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
          <input {...register('name', {required: true})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. vscode" />
        </div>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 h-[42px]">
          Add
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repository</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {repos.map(repo => (
              <tr key={repo.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {repo.owner} / {repo.name}
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
                  <button onClick={() => deleteRepo(repo.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {repos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No repositories tracked yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
