import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { CompactModeProvider } from '@/components/CompactModeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GitHub PR Comment Aggregator',
  description: 'Aggregates bot comments on GitHub PRs',
}

import RateLimitBanner from './RateLimitBanner';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <CompactModeProvider>
          <div className="min-h-screen flex flex-col">
            <RateLimitBanner />
            <div className="flex-1 flex overflow-hidden">
              <Sidebar />
              <MainContent>{children}</MainContent>
            </div>
          </div>
        </CompactModeProvider>
      </body>
    </html>
  )
}
