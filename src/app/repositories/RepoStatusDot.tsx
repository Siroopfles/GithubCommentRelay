'use client';

import { useState, useEffect } from 'react';

export function RepoStatusDot({ repoId }: { repoId: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Checking connection...');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/repositories/${repoId}/status`);
        const data = await res.json();
        if (data.status) {
            setStatus(data.status);
            setMessage(data.message);
        } else {
            setStatus('error');
            setMessage(data.error || 'Unknown error');
        }
      } catch (e) {
        setStatus('error');
        setMessage('Failed to fetch status');
      }
    };
    checkStatus();
  }, [repoId]);

  let dotClass = 'bg-gray-400 dark:bg-gray-500';
  if (status === 'ok') dotClass = 'bg-green-500 dark:bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)] dark:shadow-[0_0_8px_rgba(74,222,128,0.3)]';
  if (status === 'error') dotClass = 'bg-red-500 dark:bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)] dark:shadow-[0_0_8px_rgba(248,113,113,0.3)]';

  return (
    <div className="flex items-center gap-2" title={message}>
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass} ${status === 'loading' ? 'animate-pulse' : 'transition-colors duration-500'}`}></span>
    </div>
  );
}
