"use client";

import { useCompactMode } from '@/components/CompactModeContext';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isCompactMode } = useCompactMode();

  return (
    <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 transition-all duration-200">
      <div className={`${isCompactMode ? 'p-4' : 'p-8'} max-w-7xl mx-auto`}>
        {children}
      </div>
    </main>
  );
}
