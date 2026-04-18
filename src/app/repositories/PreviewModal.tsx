'use client';

import { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';

export function PreviewModal({ repoId, repoName }: { repoId: string, repoName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch('/api/preview-aggregation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId })
      });
      const data = await res.json();
      if (res.ok) {
        setPreview(data.preview);
      } else {
        setPreview(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setPreview(`Error fetching preview: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchPreview();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded flex items-center gap-1 transition-colors"
        title="Dry Run Template Preview"
      >
        <PlayCircle size={14} /> Preview Template
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Template Preview - {repoName}</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm border border-gray-200 dark:border-gray-700 font-mono text-gray-800 dark:text-gray-300">
                            {preview}
                        </pre>
                    </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
