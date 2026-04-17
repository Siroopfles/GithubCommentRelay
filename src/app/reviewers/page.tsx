"use client"
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, X, Save } from 'lucide-react'

type Reviewer = { id: string, username: string, isActive: boolean, noActionRegex: string | null }

export default function ReviewersPage() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<{username: string, noActionRegex: string}>()
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setError: setEditError, formState: { errors: editErrors } } = useForm<Reviewer>()
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchReviewers = async () => {
    const res = await fetch('/api/reviewers')
    const data = await res.json()
    setReviewers(data)
  }

  useEffect(() => {
    fetchReviewers()
  }, [])

  const onSubmit = async (data: {username: string, noActionRegex: string}) => {
    if (data.noActionRegex) {
      try {
        new RegExp(data.noActionRegex, 'i');
      } catch (e) {
        setError('noActionRegex', { type: 'pattern', message: 'Invalid regex' });
        return;
      }
    }
    const res = await fetch('/api/reviewers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!res.ok) {
        try {
            const errData = await res.json();
            if (errData.error?.includes('exists')) {
                 setError('username', { type: 'manual', message: 'Reviewer already exists' });
            } else if (errData.error?.includes('regex') || errData.error?.includes('Regex')) {
                 setError('noActionRegex', { type: 'manual', message: errData.error });
            } else {
                 setError('username', { type: 'manual', message: errData.error || 'Failed to add reviewer' });
            }
        } catch(e) {
            setError('username', { type: 'manual', message: 'An unknown error occurred' });
        }
        return;
    }

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

  const startEdit = (rev: Reviewer) => {
    setEditingId(rev.id)
    resetEdit({ noActionRegex: rev.noActionRegex || '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    resetEdit()
  }

  const onSaveEdit = async (data: Reviewer) => {
    if (data.noActionRegex) {
      try {
        new RegExp(data.noActionRegex, 'i');
      } catch (e) {
        setEditError('noActionRegex', { type: 'pattern', message: 'Invalid regex' });
        return;
      }
    }
    const res = await fetch(`/api/reviewers/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noActionRegex: data.noActionRegex || null })
    })

    if (!res.ok) {
        try {
            const errData = await res.json();
            setEditError('noActionRegex', { type: 'manual', message: errData.error || 'Failed to save changes' });
        } catch(e) {
            setEditError('noActionRegex', { type: 'manual', message: 'An unknown error occurred' });
        }
        return;
    }

    setEditingId(null)
    fetchReviewers()
  }

  return (
    <div className="max-w-4xl text-black">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Target Reviewers</h1>
      <p className="text-gray-600 mb-6">Add the GitHub usernames of the bots/reviewers you want to aggregate comments from.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Username</label>
            <input {...register('username', {required: true})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. dependabot[bot]" />
            {errors.username && <span className="text-xs text-red-500 mt-1 block">{errors.username.message}</span>}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">No Action Regex (Optional)</label>
            <input {...register('noActionRegex')} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. ^Coverage did not change|^0 vulnerabilities" />
            {errors.noActionRegex && <span className="text-xs text-red-500 mt-1 block">{errors.noActionRegex.message}</span>}
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 h-[42px]">
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500">If a comment matches the 'No Action Regex', it will be completely ignored and not added to the aggregation.</p>
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
                {editingId === rev.id ? (
                  <td colSpan={3} className="px-6 py-4 bg-yellow-50">
                    <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-4">
                      <input type="hidden" {...registerEdit('id')} />
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        Editing Settings for: {rev.username}
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label htmlFor="editNoActionRegex" className="block text-xs text-gray-500 mb-1">No Action Regex</label>
                          <input id="editNoActionRegex" {...registerEdit("noActionRegex")} className="w-full px-2 py-1 border rounded" placeholder="e.g. ^Coverage did not change" />
                          {editErrors.noActionRegex && <span className="text-xs text-red-500 mt-1 block">{editErrors.noActionRegex.message}</span>}
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
                      {rev.username}
                      {rev.noActionRegex && <p className="text-xs text-gray-500 mt-1">Regex: <code className="bg-gray-100 px-1 rounded">{rev.noActionRegex}</code></p>}
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
                      <button onClick={() => startEdit(rev)} aria-label={`Edit ${rev.username}`} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deleteReviewer(rev.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </>
                )}
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
