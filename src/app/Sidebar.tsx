"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, GitBranch, Users, Activity, FileText, ListTodo, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { useCompactMode } from '@/components/CompactModeContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isCompactMode, toggleCompactMode } = useCompactMode();

  const navItems = [
    { href: '/', icon: Activity, label: 'Dashboard' },
    { href: '/tasks', icon: ListTodo, label: 'Tasks' },
    { href: '/repositories', icon: GitBranch, label: 'Repositories' },
    { href: '/reviewers', icon: Users, label: 'Reviewers' },
    { href: '/logs/chat', icon: MessageSquare, label: 'Visual Filter' },
    { href: '/logs', icon: FileText, label: 'Logs' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    const baseClass = "flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors";
    const activeClass = isActive ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium" : "";
    const paddingClass = isCompactMode ? "px-3 py-2 text-sm" : "px-4 py-3";
    return `${baseClass} ${activeClass} ${paddingClass}`;
  };

  return (
    <aside className={`${isCompactMode ? 'w-56' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-200 flex flex-col`}>
      <div className={`${isCompactMode ? 'p-4' : 'p-6'} border-b border-gray-200 dark:border-gray-800`}>
        <h1 className={`${isCompactMode ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2`}>
          <Activity className="text-blue-600" size={isCompactMode ? 20 : 24} />
          Bot Aggregator
        </h1>
      </div>
      <nav className={`flex-1 overflow-y-auto ${isCompactMode ? 'p-2 space-y-1' : 'p-4 space-y-2'}`}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <item.icon size={isCompactMode ? 18 : 20} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Compact Mode Toggle */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={toggleCompactMode}
          className={`w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors ${isCompactMode ? 'py-1 text-sm' : 'py-2'}`}
          title={isCompactMode ? "Disable Compact Mode" : "Enable Compact Mode"}
        >
          {isCompactMode ? (
            <>
              <Maximize2 size={16} />
              <span>Normal View</span>
            </>
          ) : (
            <>
              <Minimize2 size={18} />
              <span>Compact View</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
