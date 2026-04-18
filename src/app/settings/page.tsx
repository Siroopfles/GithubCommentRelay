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
  const [isUpdating, setIsUpdating] = useState(false)
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

  const handleUpdate = async () => {
    const confirmed = window.confirm(
      "Waarschuwing: Dit overschrijft eventuele lokale code aanpassingen.\n\n" +
      "De applicatie zal de laatste versie van GitHub (main branch) ophalen, bouwen en herstarten. Dit kan een paar minuten duren.\n\n" +
      "Weet je zeker dat je wilt updaten?"
    );

    if (!confirmed) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/system/update', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Update failed to start');
      }

      setMessage({ type: 'success', text: data.message || 'Update gestart. De server zal binnenkort herstarten.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Er is een fout opgetreden bij het starten van de update' });
      setIsUpdating(false);
    }
  }

  if (isLoading) return <div className="text-black dark:text-gray-100">Loading settings...</div>

  return (
    <div className="max-w-2xl text-black dark:text-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'} border`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 dark:text-gray-100 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
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

      <div className="mt-12 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-red-100 dark:border-red-900">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Systeem Update</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Haal de laatste versie van GitHub op en herstart de applicatie. Let op: dit voert een `git reset --hard` uit en overschrijft lokale wijzigingen in de code.
        </p>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating ? 'Update Gestart...' : 'Update naar laatste versie'}
        </button>
      </div>
    </div>
  )
}
