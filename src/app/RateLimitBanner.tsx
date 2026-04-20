'use client';
import { useState, useEffect } from 'react';

export default function RateLimitBanner() {
  const [rateLimit, setRateLimit] = useState<{ remaining: number | null, reset: string | null }>({ remaining: null, reset: null });

  useEffect(() => {
    const fetchRateLimit = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setRateLimit({
            remaining: data.githubRateLimitRemaining,
            reset: data.githubRateLimitReset
          });
        }
      } catch (e) {
        // Ignore fetch errors
      }
    };

    fetchRateLimit();
    const interval = setInterval(fetchRateLimit, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (rateLimit.remaining === null || rateLimit.remaining >= 50) {
    return null;
  }

  let resetTime = '';
  if (rateLimit.reset) {
     const resetDate = new Date(rateLimit.reset);
     resetTime = resetDate.toLocaleTimeString();
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>
          <strong>Warning:</strong> GitHub API rate limit is critically low ({rateLimit.remaining} remaining).
          Worker may pause until {resetTime || 'the limit resets'}.
        </span>
      </div>
    </div>
  );
}
