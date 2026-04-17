"use client"
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'

type SettingsForm = {
  githubToken: string
  pollingInterval: string
  batchDelay: string
  julesApiKey: string
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [hasToken, setHasToken] = useState(false)
  const [hasJulesKey, setHasJulesKey] = useState(false)
  const { register, handleSubmit, reset } = useForm<SettingsForm>()

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setHasToken(data.hasGithubToken)
          setHasJulesKey(data.hasJulesApiKey)
          reset({
            githubToken: '', // Never pre-fill
            pollingInterval: data.pollingInterval?.toString() || '60',
            batchDelay: data.batchDelay?.toString() || '5',
            julesApiKey: ''
          })
        }
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Failed to load settings.' })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [reset])

  const onSubmit = async (data: SettingsForm) => {
    setMessage(null)

    const pollingInterval = Number(data.pollingInterval)
    const batchDelay = Number(data.batchDelay)

    if (!Number.isFinite(pollingInterval) || pollingInterval <= 0) {
      setMessage({ type: 'error', text: 'Polling Interval must be a valid positive number.' })
      return
    }
    if (!Number.isFinite(batchDelay) || batchDelay <= 0) {
      setMessage({ type: 'error', text: 'Batch Delay must be a valid positive number.' })
      return
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(data.githubToken ? { githubToken: data.githubToken } : {}),
          ...(data.julesApiKey ? { julesApiKey: data.julesApiKey } : {}),
          pollingInterval,
          batchDelay
        })
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to save settings')
      }

      setHasToken(responseData.hasGithubToken)
      setHasJulesKey(responseData.hasJulesApiKey)
      reset({
        githubToken: '', // Clear token field after save
        pollingInterval: responseData.pollingInterval.toString(),
        batchDelay: responseData.batchDelay.toString(),
        julesApiKey: '' // Clear token field after save
      })

      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred while saving settings' })
    }
  }

  if (isLoading) return <div className="text-black dark:text-gray-100">Loading settings...</div>

  return (
    <div className="max-w-2xl text-black dark:text-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} border`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 dark:bg-gray-800 dark:text-gray-100 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GitHub Personal Access Token (PAT)</label>
          <input
            type="password"
            {...register('githubToken')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
            placeholder={hasToken ? "Token is securely stored. Enter a new one to update." : "ghp_xxxxxxxxxxxxxxxxxxxx"}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">This token will be used to post the aggregated comments under your name. Ensure it has fine-grained read/write permissions for issues and pull requests.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Polling Interval (Seconds)</label>
          <input
            type="number"
            {...register('pollingInterval')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">How often the bot should check GitHub for new PR comments.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batch Delay (Minutes)</label>
          <input
            type="number"
            {...register('batchDelay')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">How long to wait after the first bot comment before aggregating and posting. This gives other bots time to comment.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jules API Key</label>
          <input
            type="password"
            {...register("julesApiKey")}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
            placeholder={hasJulesKey ? "API Key is securely stored. Enter a new one to update." : "jules_api_key..."}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">API Key used for integration with the Jules API.</p>

        </div>

        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
          Save Settings
        </button>
      </form>
    </div>
  )
}
