import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import Link from 'next/link'

export default async function FeedbackPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'admin') redirect('/crm')

  const allFeedback = await query(`
    SELECT * FROM message_feedback ORDER BY created_at DESC LIMIT 200
  `)

  const bad = allFeedback.filter(f => f.rating === 'bad')
  const good = allFeedback.filter(f => f.rating === 'good')

  const stageBreakdown = bad.reduce((acc: Record<string, number>, f) => {
    const s = f.stage_name || 'unknown'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">🧠 AI Message Feedback</h1>
        <p className="text-slate-400 text-sm mt-1">Ratings from VA on outreach drafts. Use this to improve prompts.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-slate-300">{allFeedback.length}</div>
          <div className="text-xs text-slate-400 mt-1">Total Rated</div>
        </div>
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{good.length}</div>
          <div className="text-xs text-slate-400 mt-1">👍 Good</div>
        </div>
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-400">{bad.length}</div>
          <div className="text-xs text-slate-400 mt-1">👎 Bad</div>
        </div>
      </div>

      {/* Bad by stage */}
      {bad.length > 0 && Object.keys(stageBreakdown).length > 0 && (
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3">👎 Bad Ratings by Stage</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stageBreakdown).sort((a,b) => b[1]-a[1]).map(([stage, count]) => (
              <span key={stage} className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1 rounded-full">
                {stage}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bad feedback with text */}
      <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="font-semibold text-white">👎 Bad Messages + Feedback</h2>
          <p className="text-xs text-slate-400 mt-0.5">These are the messages that need prompt improvement</p>
        </div>
        <div className="p-4 space-y-3">
          {bad.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">No bad ratings yet 🎉</div>
          )}
          {bad.map(f => (
            <div key={f.id} className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white text-sm">{f.contact_name || 'Unknown'}</span>
                {f.stage_name && (
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{f.stage_name}</span>
                )}
                <span className="text-xs text-slate-500 ml-auto">
                  {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {f.created_by && ` · ${f.created_by}`}
                </span>
              </div>
              <div className="bg-slate-900 rounded-lg px-3 py-2 text-sm text-slate-300 italic">
                &ldquo;{f.message}&rdquo;
              </div>
              {f.feedback_text && (
                <div className="flex gap-2 items-start">
                  <span className="text-red-400 text-xs font-medium shrink-0 mt-0.5">Feedback:</span>
                  <span className="text-red-300 text-xs">{f.feedback_text}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Good messages */}
      {good.length > 0 && (
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-semibold text-white">👍 Good Messages (examples to keep)</h2>
          </div>
          <div className="p-4 space-y-2">
            {good.slice(0,10).map(f => (
              <div key={f.id} className="border border-green-700/30 bg-green-900/10 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400">{f.contact_name}</span>
                  {f.stage_name && <span className="text-xs bg-slate-700 text-slate-400 px-1.5 rounded">{f.stage_name}</span>}
                </div>
                <div className="text-sm text-slate-300 italic">&ldquo;{f.message}&rdquo;</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
