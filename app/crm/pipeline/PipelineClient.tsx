'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface OppStage {
  id: string
  name: string
  order: number
}

interface ConversationFacts {
  conversationId: string | null
  messageCount: number
  lastDirection: 'inbound' | 'outbound' | null
  lastMessageBody: string | null
  lastMessageDate: string | null
  unreadCount: number
  hasInboundEver: boolean
  hasAttachment: boolean
  keywords: string[]
  droppedBall: boolean
}

interface OppSuggestion {
  toStage: string
  toStageId: string
  reason: string
  urgent?: boolean
}

interface Opportunity {
  id: string
  name: string
  phone: string
  email: string
  monetaryValue: number
  stage: string
  stageName: string
  stageId: string
  hoursStuck: number
  createdAt: string
  lastStageChangeAt: string
  contactId: string
  conversation: ConversationFacts
  suggestion: OppSuggestion | null
}

interface OppBoardData {
  stages: OppStage[]
  opportunities: Opportunity[]
  stageMap: Record<string, string>
  totalValue: number
  counts: Record<string, number>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeStuck(hours: number): string {
  if (hours < 1) return '<1h'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

function stuckColor(hours: number): string {
  if (hours < 72) return 'bg-green-500/15 text-green-400 border-green-500/30'
  if (hours < 168) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}

function formatCurrency(val: number): string {
  return '$' + val.toLocaleString('en-US')
}

const CLOSED_STAGES = new Set(['Closed Won', 'Closed Lost'])

// ─── DirectionBadge ─────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: 'inbound' | 'outbound' | null }) {
  if (direction === 'inbound') {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-medium">
        📨 They replied
      </span>
    )
  }
  if (direction === 'outbound') {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-700 border border-slate-600 text-slate-400 font-medium">
        ✉️ Awaiting reply
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-500 font-medium">
      🔇 No contact
    </span>
  )
}

// ─── OpportunityCard ─────────────────────────────────────────────────────────

function OpportunityCard({
  opp,
  stages,
  onMoved,
}: {
  opp: Opportunity
  stages: OppStage[]
  onMoved: (id: string) => void
}) {
  const [moving, setMoving] = useState(false)
  const [moveError, setMoveError] = useState('')

  const handleMove = async (stageId: string) => {
    if (!stageId || stageId === opp.stageId) return
    setMoving(true)
    setMoveError('')
    try {
      const res = await fetch('/api/admin/ghl-opportunities/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: opp.id, stageId }),
      })
      if (res.ok) {
        onMoved(opp.id)
      } else {
        const d = await res.json().catch(() => ({}))
        setMoveError(d.error || 'Move failed')
      }
    } catch {
      setMoveError('Network error')
    } finally {
      setMoving(false)
    }
  }

  const conv = opp.conversation
  const isUrgent = opp.suggestion?.urgent === true

  const suggestionBannerClass = isUrgent
    ? 'bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2'
    : 'bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2'

  const suggestionTitleClass = isUrgent
    ? 'text-red-300 text-xs font-semibold'
    : 'text-yellow-300 text-xs font-semibold'

  const suggestionReasonClass = isUrgent
    ? 'text-red-400/70 text-xs mt-0.5'
    : 'text-yellow-400/70 text-xs mt-0.5'

  const suggestionBtnClass = isUrgent
    ? 'shrink-0 text-xs bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-300 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50'
    : 'shrink-0 text-xs bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/40 text-yellow-300 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50'

  return (
    <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/40 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{opp.name}</div>
          <div className="text-slate-400 text-xs mt-0.5">
            {opp.phone || opp.email || '—'}
          </div>
          {conv?.lastMessageBody && (
            <div className="text-slate-500 text-xs mt-1 truncate italic">
              &ldquo;{conv.lastMessageBody}&rdquo;
            </div>
          )}
          {conv && (
            <div className="mt-1.5">
              <DirectionBadge direction={conv.lastDirection} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {opp.monetaryValue > 0 && (
            <span className="text-amber-400 text-sm font-bold">{formatCurrency(opp.monetaryValue)}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stuckColor(opp.hoursStuck)}`}>
            {formatTimeStuck(opp.hoursStuck)}
          </span>
        </div>
      </div>

      {/* Dropped ball banner */}
      {conv?.droppedBall && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-lg px-3 py-2">
          <div className="text-red-300 text-xs font-bold">🔴 They&apos;re waiting on us</div>
        </div>
      )}

      {/* Suggestion banner */}
      {opp.suggestion && (
        <div className={suggestionBannerClass}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className={suggestionTitleClass}>
                ⚡ Suggest: Move to {opp.suggestion.toStage}
              </div>
              <div className={suggestionReasonClass}>{opp.suggestion.reason}</div>
            </div>
            <button
              onClick={() => handleMove(opp.suggestion!.toStageId)}
              disabled={moving}
              className={suggestionBtnClass}
            >
              {moving ? '…' : 'Move Now'}
            </button>
          </div>
        </div>
      )}

      {/* Move Stage dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-slate-500 text-xs shrink-0">Move to:</label>
        <select
          defaultValue=""
          onChange={e => { if (e.target.value) handleMove(e.target.value) }}
          disabled={moving}
          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
        >
          <option value="" disabled>Select stage…</option>
          {stages
            .filter(s => s.id !== opp.stageId)
            .map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
        </select>
      </div>

      {moveError && <p className="text-red-400 text-xs">{moveError}</p>}
    </div>
  )
}

// ─── PipelineClient (main export) ───────────────────────────────────────────

export default function PipelineClient() {
  const [data, setData] = useState<OppBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState('')
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/ghl-opportunities')
      .then(r => r.json())
      .then((d: OppBoardData & { error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
        const firstStage = d.stages
          .slice()
          .sort((a, b) => a.order - b.order)
          .find(s => (d.counts[s.name] || 0) > 0)
        if (firstStage) setActiveStage(firstStage.name)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleMoved = (id: string) => {
    setRemoved(prev => { const next = new Set(prev); next.add(id); return next })
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Pipeline Board</h2>
        <p className="text-slate-400 text-sm mb-6">GHL opportunity pipeline view</p>
        <div className="text-slate-500 text-sm py-12 text-center">Loading pipeline…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Pipeline Board</h2>
        <p className="text-slate-400 text-sm mb-6">GHL opportunity pipeline view</p>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-5 py-4">
          {error}
          <button onClick={load} className="ml-4 underline text-red-300 hover:text-red-200">Retry</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const activeOpps = data.opportunities.filter(
    o => !CLOSED_STAGES.has(o.stageName) && !removed.has(o.id)
  )
  const withSuggestions = activeOpps.filter(o => o.suggestion)

  const stagesWithOpps = data.stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter(s => (data.counts[s.name] || 0) > 0)

  const stageOpps = data.opportunities.filter(
    o => o.stageName === activeStage && !removed.has(o.id)
  )

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Pipeline Board</h2>
      <p className="text-slate-400 text-sm mb-6">GHL opportunity pipeline. Move leads, act on suggestions.</p>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
          <div className="text-slate-400 text-xs mb-1">Pipeline Value</div>
          <div className="text-amber-400 font-bold text-lg">{formatCurrency(data.totalValue)}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
          <div className="text-slate-400 text-xs mb-1">Active Leads</div>
          <div className="text-white font-bold text-lg">{activeOpps.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
          <div className="text-slate-400 text-xs mb-1">Need Action</div>
          <div className={`font-bold text-lg ${withSuggestions.length > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
            {withSuggestions.length}
          </div>
        </div>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        {stagesWithOpps.map(s => {
          const count = data.counts[s.name] || 0
          const isActive = s.name === activeStage
          return (
            <button
              key={s.id}
              onClick={() => setActiveStage(s.name)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              {s.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lead cards */}
      {stageOpps.length === 0 ? (
        <div className="text-slate-500 text-sm py-10 text-center border border-slate-700 rounded-xl">
          No leads in this stage{removed.size > 0 ? ' (moved leads hidden until refresh)' : ''}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stageOpps.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              stages={data.stages}
              onMoved={handleMoved}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={load}
          className="text-slate-500 hover:text-slate-300 text-xs border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
        >
          ↺ Refresh
        </button>
      </div>
    </div>
  )
}
