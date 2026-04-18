import { prisma } from '@/lib/prisma'
import { CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default async function Archive({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, Math.floor(Number(params.page) || 1))
  const pageSize = 20

  const [comments, total] = await Promise.all([
    prisma.processedComment.findMany({
      orderBy: { processedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.processedComment.count()
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 text-black dark:text-gray-100">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Historical Archive</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            Processed Comments ({total})
          </h2>
        </div>
        <div className="p-0">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {comments.map(comment => (
              <li key={comment.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {comment.repoOwner}/{comment.repoName} #PR-{comment.prNumber}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {new Date(comment.processedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Source: <span className="font-medium text-gray-700 dark:text-gray-300">{comment.source}</span> • Author: <span className="font-medium text-gray-700 dark:text-gray-300">{comment.author}</span> • Skipped: <span className="font-medium text-gray-700 dark:text-gray-300">{comment.isSkipped ? 'Yes' : 'No'}</span> • Forwarded to Jules: <span className="font-medium text-gray-700 dark:text-gray-300">{comment.forwardedToJules ? 'Yes' : 'No'}</span>
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                    <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono">{comment.body}</pre>
                </div>
              </li>
            ))}
            {comments.length === 0 && (
              <li className="p-6 text-center text-gray-500 dark:text-gray-400">No records found.</li>
            )}
          </ul>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, total)}</span> of <span className="font-medium">{total}</span> results
            </p>
            <div className="flex gap-2">
              <a
                href={page > 1 ? `/archive?page=${page - 1}` : '#'}
                className={`px-3 py-1 border dark:border-gray-600 rounded text-sm ${page > 1 ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600' : 'text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'}`}
              >
                Previous
              </a>
              <a
                href={page < totalPages ? `/archive?page=${page + 1}` : '#'}
                className={`px-3 py-1 border dark:border-gray-600 rounded text-sm ${page < totalPages ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600' : 'text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'}`}
              >
                Next
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
