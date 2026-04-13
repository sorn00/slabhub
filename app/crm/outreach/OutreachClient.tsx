'use client'

import { useState } from 'react'

type OutreachItem = {
  id: number
  contact_name: string
  phone: string
  stage: string
  value: number
  message: string
  status: string
}

const STAGE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  quote_sent: { label: 'Quote Follow-up', color: 'text-amber-400', emoji: '💰' },
  ready_for_templating: { label: 'Templating Ready', color: 'text-blue-400', emoji: '📅' },
  templating_done: { label: 'Templating Done', color: 'text-green-400', emoji: '🎉' },
  sketch_received: { label: 'Sketch Received', color: 'text-purple-400', emoji: '📐' },
}

export default function OutreachClient({ initialQueue }: { initialQueue: OutreachItem[] }) {
  const [queue, setQueue] = useState(initialQueue)
  const [loading, setLoading] = useState<Record<number, string>>({})
  const [sendAllLoading, setSendAllLoading] = useState(false)
  const [results, setResults] = useState<{ name: string; status: string }[]>([])

  const pending = queue.filter(i => i.status === 'pending')

  async function sendOne(id: number) {
    setLoading(l => ({ ...l, [id]: 'sending' }))
    try {
      const r = await fetch(`/api/outreach-queue/${id}/send`, { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setQueue(q => q.map(i => i.id === id ? { ...i, status: 'sent' } : i))
        setLoading(l => ({ ...l, [id]: 'sent' }))
      } else {
        setLoading(l => ({ ...l, [id]: 'error' }))
        alert('Send failed: ' + (d.error || 'unknown error'))
      }
    } catch (e) {
      setLoading(l => ({ ...l, [id]: 'error' }))
    }
  }

  async function skipOne(id: number) {
    setLoading(l => ({ ...l, [id]: 'skipping' }))
    await fetch(`/api/outreach-queue/${id}/skip`, { method: 'POST' })
    setQueue(q => q.map(i => i.id === id ? { ...i, status: 'skipped' } : i))
  }

  async function sendAll() {
    if (!confirm(`Send all ${pending.length} pending messages now?`)) return
    setSendAllLoading(true)
    try {
      const r = await fetch('/api/outreach-queue/send-all', { method: 'POST' })
      const d = await r.json()
      const res = d.results || []
      setResults(res)
      // Refresh queue state
      const r2 = await fetch('/api/outreach-queue')
      const d2 = await r2.json()
      setQueue(d2.queue || [])
    } catch (e) {
      alert('Error sending all: ' + String(e))
    } finally {
      setSendAllLoading(false)
    }
  }

  const stageGroups = Object.entries(
    pending.reduce((acc, item) => {
      const s = item.stage || 'other'
      if (!acc[s]) acc[s] = []
      acc[s].push(item)
      return acc
    }, {} as Record<string, OutreachItem[]>)
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Outreach Queue</h1>
          <p className="text-slate-400 text-sm mt-1">
            {pending.length > 0
              ? `${pending.length} message${pending.length !== 1 ? 's' : ''} pending approval`
              : '✅ All clear — no pending messages'}
          </p>
        </div>
        {pending.length > 0 && (
          <button
            onClick={sendAll}
            disabled={sendAllLoading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {sendAllLoading ? '⏳ Sending...' : `🚀 Send All (${pending.length})`}
          </button>
        )}
      </div>

      {/* Send All Results */}
      {results.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-slate-300 mb-2">Send Results</div>
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{r.status === 'sent' ? '✅' : '❌'}</span>
                <span className="text-slate-300">{r.name}</span>
                <span className={r.status === 'sent' ? 'text-green-400' : 'text-red-400'}>
                  {r.status === 'sent' ? 'Sent' : r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {pending.length === 0 && results.length === 0 && (
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-white font-semibold">No pending messages</div>
          <div className="text-slate-400 text-sm mt-1">All caught up</div>
        </div>
      )}

      {/* Grouped by stage */}
      {stageGroups.map(([stage, items]) => {
        const meta = STAGE_LABELS[stage] || { label: stage, color: 'text-slate-400', emoji: '📨' }
        return (
          <div key={stage}>
            <div className={`text-xs font-semibold uppercase tracking-wider ${meta.color} mb-3`}>
              {meta.emoji} {meta.label}
            </div>
            <div className="space-y-3">
              {items.map(item => {
                const state = loading[item.id]
                const isSent = state === 'sent' || item.status === 'sent'
                const isSkipped = state === 'skipping' || item.status === 'skipped'
                return (
                  <div
                    key={item.id}
                    className={`bg-[#1a1a2e] border rounded-xl p-4 transition-all ${
                      isSent ? 'border-green-500/40 opacity-60' :
                      isSkipped ? 'border-slate-600 opacity-40' :
                      'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">{item.contact_name}</span>
                          {item.value > 0 && (
                            <span className="text-amber-400 text-xs font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              ${item.value.toLocaleString()}
                            </span>
                          )}
                          <span className="text-slate-500 text-xs">{item.phone}</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{item.message}</p>
                      </div>
                      <div className="flex gap-2 shrink-0 mt-0.5">
                        {isSent ? (
                          <span className="text-green-400 text-sm font-medium">✅ Sent</span>
                        ) : isSkipped ? (
                          <span className="text-slate-500 text-sm">Skipped</span>
                        ) : (
                          <>
                            <button
                              onClick={() => sendOne(item.id)}
                              disabled={!!loading[item.id]}
                              className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {loading[item.id] === 'sending' ? '...' : '✔ Send'}
                            </button>
                            <button
                              onClick={() => skipOne(item.id)}
                              disabled={!!loading[item.id]}
                              className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-400 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              ✕ Skip
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
