'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Generate a strong random password on component mount
    const generatePassword = () => {
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
      let newPassword = '';
      for (let i = 0, n = charset.length; i < 32; ++i) {
        newPassword += charset.charAt(Math.floor(Math.random() * n));
      }
      return newPassword;
    };

    const fetchSetupStatus = async () => {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();
        if (data.setupCompleted) {
          router.push('/login');
        } else {
          setPassword(generatePassword());
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to check setup status:', error);
        setIsLoading(false);
      }
    };

    fetchSetupStatus();
  }, [router]);

  const copyToClipboard = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCompleteSetup = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/login');
      } else {
        alert('Failed to complete setup.');
      }
    } catch (error) {
      console.error('Failed to setup:', error);
      alert('An error occurred during setup.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Initial Setup</h1>

        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
            Warning: Save this Master Password now! It is required to log in and cannot be recovered if lost. You will need to reset the database if you lose it.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Master Password</label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={password || ''}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white font-mono text-sm pr-20"
            />
            <button
              onClick={copyToClipboard}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded"
            >
              {isCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <button
          onClick={handleCompleteSetup}
          disabled={isLoading || !password}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          I have safely stored my password
        </button>
      </div>
    </div>
  );
}
