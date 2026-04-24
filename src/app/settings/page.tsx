"use client"
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'

type SettingsForm = {
  githubToken: string
  pollingInterval: string
  batchDelay: string
  pruneDays: string
  julesApiKey: string
  webhookSecret: string
}

export default function SettingsPage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateSecret, setUpdateSecret] = useState('')
  type BotAgentMapping = { id: string; botSource: string; agentName: string; role?: string; createdAt?: string };
  const [botMappings, setBotMappings] = useState<BotAgentMapping[]>([])
  const [newBotSource, setNewBotSource] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [hasToken, setHasToken] = useState(false)
  const [hasJulesKey, setHasJulesKey] = useState(false)
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false)
  const { register, handleSubmit, reset } = useForm<SettingsForm>()

  useEffect(() => {
    fetch('/api/bot-agent-mappings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
           setBotMappings(data);
        }
      })
      .catch(console.error);

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setHasToken(data.hasGithubToken)
          setHasJulesKey(data.hasJulesApiKey)
          setHasWebhookSecret(data.hasWebhookSecret)
          reset({
            githubToken: '', // Never pre-fill
            pollingInterval: data.pollingInterval?.toString() || '60',
            batchDelay: data.batchDelay?.toString() || '5',
            pruneDays: data.pruneDays?.toString() || '60',
            julesApiKey: '',
        webhookSecret: ''
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
    const pruneDays = Number(data.pruneDays)

    if (!Number.isInteger(pollingInterval) || pollingInterval <= 0) {
      setMessage({ type: 'error', text: 'Polling Interval must be a valid positive number.' })
      return
    }
    if (!Number.isInteger(pruneDays) || pruneDays <= 0) {
      setMessage({ type: 'error', text: 'Prune Days must be a positive integer.' })
      return
    }

    if (!Number.isInteger(batchDelay) || batchDelay <= 0) {
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
          ...(data.webhookSecret ? { webhookSecret: data.webhookSecret } : {}),
          pollingInterval,
          batchDelay,
          pruneDays
        })
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to save settings')
      }

      setHasToken(responseData.hasGithubToken)
      setHasJulesKey(responseData.hasJulesApiKey)
      setHasWebhookSecret(responseData.hasWebhookSecret)
      reset({
        githubToken: '', // Clear token field after save
        pollingInterval: responseData.pollingInterval.toString(),
        batchDelay: responseData.batchDelay.toString(),
        pruneDays: (responseData.pruneDays ?? pruneDays).toString(),
        julesApiKey: '' // Clear token field after save
      })

      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred while saving settings' })
    }
  }

  const handleAddMapping = async () => {
    if (!newBotSource || !newAgentName) return;
    try {
      const res = await fetch('/api/bot-agent-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botSource: newBotSource, agentName: newAgentName, role: newRole })
      });
      if (res.ok) {
        const mapping = await res.json();
        setBotMappings([...botMappings, mapping]);
        setNewBotSource('');
        setNewAgentName('');
        setNewRole('');
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to add mapping' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const res = await fetch(`/api/bot-agent-mappings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBotMappings(botMappings.filter(m => m.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to delete mapping' });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Failed to delete mapping' });
    }
  };

  const confirmUpdate = async () => {
    if (!updateSecret) {
      setShowUpdateModal(false)
      setMessage({ type: 'error', text: 'System Update Secret is required.' })
      return
    }

    setShowUpdateModal(false)
    setIsUpdating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/system/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${updateSecret}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Update failed to start');
      }

      setMessage({ type: 'success', text: data.message || 'Update started. The server will restart shortly.' });
      setUpdateSecret('');
      window.setTimeout(() => {
        setIsUpdating(false)
      }, 5 * 60 * 1000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred while starting the update' });
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-Prune Days</label>
          <input
            type="number"
            {...register('pruneDays')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Number of days to keep processed comments in the database before deleting them to save space.</p>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Webhook Secret</label>
          <input
            type="password"
            {...register('webhookSecret')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
            placeholder={hasWebhookSecret ? "Secret is securely stored. Enter a new one to update." : "Webhook Secret..."}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Used to verify the signature of incoming GitHub Webhooks. Highly recommended for production.</p>
        </div>


        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
          Save Settings
        </button>
      </form>

      <div className="mt-12 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Bot to Agent Mappings</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Map specific bots to AI agent personas. For example, map "eslint" to "@linter-agent". When the bot comments, the agent will be tagged in the aggregated output.
        </p>

        <div className="space-y-4 mb-6">
          {botMappings.map(mapping => (
            <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <div>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{mapping.botSource}</span>
                <span className="mx-2 text-gray-400">→</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{mapping.agentName}</span>
              </div>
              <button onClick={() => handleDeleteMapping(mapping.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
            </div>
          ))}
          {botMappings.length === 0 && <p className="text-sm text-gray-500">No mappings configured yet.</p>}
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bot Source (e.g. eslint)</label>
            <input type="text" value={newBotSource} onChange={e => setNewBotSource(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name (e.g. @linter-agent)</label>
            <input type="text" value={newAgentName} onChange={e => setNewAgentName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role (Optional)</label>
            <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="e.g. Reviewer" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100" />
          </div>
          <button onClick={handleAddMapping} className="px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors">
            Add
          </button>
        </div>
      </div>

      <div className="mt-12 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-red-100 dark:border-red-900">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">System Update</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Fetch the latest version from GitHub and restart the application. Warning: this performs a `git reset --hard` and overwrites local changes.
        </p>
        <button
          onClick={() => setShowUpdateModal(true)}
          disabled={isUpdating}
          className="px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating ? 'Update Started...' : 'Update to latest version'}
        </button>
      </div>

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Confirm System Update</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Warning: This will overwrite any local code modifications. The application will fetch the latest version from GitHub (main branch), build, and restart. This may take a few minutes.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System Update Secret</label>
            <input
              type="password"
              value={updateSecret}
              onChange={(e) => setUpdateSecret(e.target.value)}
              className="w-full px-4 py-2 mb-6 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100"
              placeholder="Enter secret to confirm..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUpdateModal(false)
                  setUpdateSecret('')
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  )
}
