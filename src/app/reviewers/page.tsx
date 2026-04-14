"use client"
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2 } from 'lucide-react'

type Reviewer = { id: string, username: string, isActive: boolean }

export default function ReviewersPage() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const { register, handleSubmit, reset } = useForm<{username: string}>()

  const fetchReviewers = async () => {
    const res = await fetch('/api/reviewers')
    const data = await res.json()
    setReviewers(data)
  }

  useEffect(() => {
    fetchReviewers()
  }, [])

  const onSubmit = async (data: {username: string}) => {
    await fetch('/api/reviewers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    reset()
    fetchReviewers()
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/reviewers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentStatus })
    })
    fetchReviewers()
  }

  const deleteReviewer = async (id: string) => {
    await fetch(`/api/reviewers/${id}`, { method: 'DELETE' })
    fetchReviewers()
  }

  return (
    <div className="max-w-3xl text-black">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Target Reviewers</h1>
      <p className="text-gray-600 mb-6">Add the GitHub usernames of the bots/reviewers you want to aggregate comments from.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-end mb-8">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Username</label>
          <input {...register('username', {required: true})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. dependabot[bot]" />
        </div>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 h-[42px]">
          Add
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reviewers.map(rev => (
              <tr key={rev.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {rev.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => toggleActive(rev.id, rev.isActive)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${rev.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {rev.isActive ? 'Active' : 'Paused'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => deleteReviewer(rev.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {reviewers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No reviewers tracked yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
