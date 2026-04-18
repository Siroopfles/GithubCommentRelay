import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Settings, GitBranch, Users, Activity, FileText } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GitHub PR Comment Aggregator',
  description: 'Aggregates bot comments on GitHub PRs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Activity className="text-blue-600" />
                  Bot Aggregator
                </h1>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Activity size={20} />
                  Dashboard
                </Link>
                <Link href="/repositories" className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <GitBranch size={20} />
                  Repositories
                </Link>
                <Link href="/reviewers" className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Users size={20} />
                  Reviewers
                </Link>
                <Link href="/logs" className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <FileText size={20} />
                  Logs
                </Link>
                <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Settings size={20} />
                  Settings
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
            <div className="p-8 max-w-5xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
