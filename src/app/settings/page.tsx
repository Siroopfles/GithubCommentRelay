"use client"
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'

type SettingsForm = {
  githubToken: string
  pollingInterval: number
  batchDelay: number
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const { register, handleSubmit, reset } = useForm<SettingsForm>()

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          reset({
            githubToken: data.githubToken || '',
            pollingInterval: data.pollingInterval,
            batchDelay: data.batchDelay
          })
        }
        setIsLoading(false)
      })
  }, [reset])

  const onSubmit = async (data: SettingsForm) => {
    setMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubToken: data.githubToken,
          pollingInterval: Number(data.pollingInterval),
          batchDelay: Number(data.batchDelay)
        })
      })
      if (!res.ok) throw new Error('Failed to save settings')
      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while saving settings' })
    }
  }

  if (isLoading) return <div className="text-black">Loading settings...</div>

  return (
    <div className="max-w-2xl text-black">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} border`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Personal Access Token (PAT)</label>
          <input
            type="password"
            {...register('githubToken')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          />
          <p className="mt-2 text-xs text-gray-500">This token will be used to post the aggregated comments under your name. Make sure it has `repo` permissions.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Polling Interval (Seconds)</label>
          <input
            type="number"
            {...register('pollingInterval')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
          />
          <p className="mt-2 text-xs text-gray-500">How often the bot should check GitHub for new PR comments.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Batch Delay (Minutes)</label>
          <input
            type="number"
            {...register('batchDelay')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
          />
          <p className="mt-2 text-xs text-gray-500">How long to wait after the first bot comment before aggregating and posting. This gives other bots time to comment.</p>
        </div>

        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
          Save Settings
        </button>
      </form>
    </div>
  )
}
