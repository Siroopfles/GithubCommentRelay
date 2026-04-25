"use client"
import { useState, useEffect, useRef } from 'react'
import { Filter, X, Save, MessageSquare } from 'lucide-react'

type Comment = {
  id: string
  prNumber: number
  repoOwner: string
  repoName: string
  author: string
  body: string
  postedAt: string
  source: string
}

export default function ChatFilterBuilder() {
  const [comments, setComments] = useState<Comment[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
const [showModal, setShowModal] = useState(false)
  const ruleType = "reviewer";
    const [botSource, setBotSource] = useState("")
  const [reviewerName, setReviewerName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/raw-comments?limit=30')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setComments(data)
      })
  }, [])

  const handleMouseUp = (e: React.MouseEvent, author: string, source: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 3) {
      setSelectedText(selection.toString().trim());
      // Adjust popup position with bounds checking
      const y = Math.max(8, e.clientY - 40);
      const halfTooltipWidth = 100; // approximation
      const x = Math.min(Math.max(halfTooltipWidth, e.clientX), window.innerWidth - halfTooltipWidth);
      setTooltipPos({ x, y });
      setBotSource(source);
      setReviewerName(author);
      setShowTooltip(true);
    } else {
      setShowTooltip(false);
    }
  }

  const escapeRegex = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  const handleCreateRule = async () => {
    setIsLoading(true);
    const regexPattern = escapeRegex(selectedText);

    if (ruleType === "reviewer") {
      // Find or create reviewer and append regex
      const res = await fetch('/api/reviewers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: reviewerName,
          noActionRegex: regexPattern // This currently overwrites, in a real scenario we might append to existing
        })
      });
    } else {
       // Just as an example, if you wanted to update bot mappings
       alert(`Would create Bot Rule for ${botSource} ignoring: ${regexPattern}`);
    }

    setIsLoading(false);
    setShowModal(false);
    setShowTooltip(false);
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div className="max-w-5xl text-black dark:text-gray-100 relative" ref={chatRef}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageSquare /> Visual Rule Builder
        </h1>
        <p className="text-gray-500 text-sm">Select text in a comment to create an ignore rule.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        {comments.map(comment => (
          <div key={comment.id} className="flex flex-col gap-1 border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-bold text-blue-600">{comment.author}</span>
              <span>on {comment.repoOwner}/{comment.repoName} #{comment.prNumber}</span>
              <span className="text-xs text-gray-400">{new Date(comment.postedAt).toLocaleString()}</span>
            </div>
            <div
              className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap selection:bg-blue-200 selection:text-blue-900"
              onMouseUp={(e) => handleMouseUp(e, comment.author, comment.source)}
            >
              {comment.body}
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-gray-500">No recent comments found in database.</p>}
      </div>

      {/* Tooltip for Selection */}
      {showTooltip && (
        <div
          className="fixed z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2 transition-transform transform -translate-x-1/2"
          style={{ top: tooltipPos.y, left: tooltipPos.x }}
          onClick={() => { setShowModal(true); setShowTooltip(false); }}
        >
          <Filter size={16} /> Create Rule from Selection
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Ignore Rule</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Author</label>
                <input type="text" value={reviewerName} readOnly className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Selected Text (to ignore)</label>
                <div className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all max-h-32 overflow-y-auto">
                  {selectedText}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Generated Regex Pattern</label>
                <input type="text" value={escapeRegex(selectedText)} readOnly className="w-full font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm text-green-600" />
                <p className="text-xs text-gray-500 mt-1">If this author posts a comment containing this text, it will be skipped by the aggregator.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
                <button onClick={handleCreateRule} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save size={18} /> {isLoading ? 'Saving...' : 'Save Reviewer Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
