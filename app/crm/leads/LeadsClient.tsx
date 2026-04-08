'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

interface RecentMessage {
  direction: string
  body: string
  dateAdded: string
}

interface PrioritizedLead {
  id: string
  contactId: string
  name: string
  phone: string
  email: string
  stageName: string
  priority: 'HOT' | 'WARM' | 'FOLLOW-UP' | 'MONITORING'
  conversationId: string | null
  lastMessage: string | null
  lastMessageDirection: string | null
  lastMessageAt: string | null
  lastMessageAgo: string | null
  createdAt: string
  recentMessages: RecentMessage[]
}

interface Props {
  isAdmin: boolean
}

const PRIORITY_CONFIG = {
  HOT: { emoji: '🔴', label: 'HOT', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  WARM: { emoji: '🟡', label: 'WARM', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'FOLLOW-UP': { emoji: '🟠', label: 'FOLLOW-UP', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  MONITORING: { emoji: '⬜', label: 'MONITORING', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

function getSuggestedReply(lead: PrioritizedLead): string {
  const firstName = lead.name?.split(' ')[0] || lead.name || 'there'
  if (lead.priority === 'HOT') {
    return `Hi ${firstName}! Thanks for sending that over. Just wanted to make sure I didn't miss you — when works for a quick call to go over your project?`
  }
  if (lead.priority === 'WARM') {
    return `Hi ${firstName}! Just checking in — are you still looking to update your countertops? We'd love to help!`
  }
  return `Hi ${firstName}! Just wanted to follow up on the quote we sent. Any questions? Happy to walk you through everything.`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Draft Reply Modal
function DraftReplyModal({
  lead,
  onClose,
  isAdmin,
}: {
  lead: PrioritizedLead
  onClose: () => void
  isAdmin: boolean
}) {
  const cfg = PRIORITY_CONFIG[lead.priority]
  const [message, setMessage] = useState(getSuggestedReply(lead))
  const [status, setStatus] = useState<'idle' | 'staging' | 'confirming' | 'sending' | 'done' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  async function handleStage() {
    setStatus('staging')
    try {
      const res = await fetch('/api/crm/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: lead.contactId,
          conversationId: lead.conversationId,
          message,
          phone: lead.phone,
          contactName: lead.name,
          stageName: lead.stageName,
          priority: lead.priority,
          action: 'stage',
        }),
      })
      if (res.ok) {
        setStatus('done')
        setStatusMsg('✅ Staged for review! You\'ll see it in the CRM message queue.')
      } else {
        const d = await res.json()
        setStatus('error')
        setStatusMsg(d.error || 'Failed to stage message')
      }
    } catch (err) {
      setStatus('error')
      setStatusMsg(String(err))
    }
  }

  async function handleSend() {
    if (status === 'confirming') {
      // Actually send
      setStatus('sending')
      try {
        const res = await fetch('/api/crm/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: lead.contactId,
            conversationId: lead.conversationId,
            message,
            phone: lead.phone,
            contactName: lead.name,
            stageName: lead.stageName,
            priority: lead.priority,
            action: 'send',
            confirmed: true,
          }),
        })
        const d = await res.json()
        if (res.ok && d.success) {
          setStatus('done')
          setStatusMsg('✅ Message sent via SMS!')
        } else {
          setStatus('error')
          setStatusMsg(d.error || 'Send failed')
        }
      } catch (err) {
        setStatus('error')
        setStatusMsg(String(err))
      }
    } else {
      // Show confirmation step
      setStatus('confirming')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                {cfg.emoji} {cfg.label}
              </span>
              <span className="font-semibold text-white">{lead.name}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{lead.phone} · {lead.stageName}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Conversation history */}
        {lead.recentMessages.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recent Messages</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lead.recentMessages.slice().reverse().map((msg, i) => (
                <div key={i} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                    msg.direction === 'outbound'
                      ? 'bg-[#d4a847]/20 text-[#d4a847] border border-[#d4a847]/30'
                      : 'bg-slate-700 text-white'
                  }`}>
                    <div>{msg.body}</div>
                    <div className={`text-[10px] mt-0.5 ${msg.direction === 'outbound' ? 'text-[#d4a847]/60' : 'text-slate-500'}`}>
                      {formatDate(msg.dateAdded)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reply composer */}
        <div className="px-5 py-4 space-y-3">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Draft Reply</div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            placeholder="Type your message..."
          />

          {/* Status message */}
          {statusMsg && (
            <div className={`text-sm rounded-xl px-3 py-2 ${
              status === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}>
              {statusMsg}
            </div>
          )}

          {/* Confirm banner */}
          {status === 'confirming' && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2.5 text-sm text-orange-300">
              ⚠️ This will send an SMS to <strong>{lead.phone}</strong>. Click "Confirm Send" to proceed.
            </div>
          )}

          {status === 'done' ? (
            <button onClick={onClose} className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
              Close
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleStage}
                disabled={status === 'staging' || status === 'sending'}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                {status === 'staging' ? 'Staging…' : '📥 Stage for Review'}
              </button>
              {isAdmin && (
                <button
                  onClick={handleSend}
                  disabled={status === 'staging' || status === 'sending'}
                  className={`flex-1 disabled:opacity-50 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    status === 'confirming'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#d4a847] hover:bg-[#c4983a] text-slate-900'
                  }`}
                >
                  {status === 'sending' ? 'Sending…' : status === 'confirming' ? '⚠️ Confirm Send' : '📤 Send via GHL'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Lead card
function LeadCard({
  lead,
  isAdmin,
  onDone,
}: {
  lead: PrioritizedLead
  isAdmin: boolean
  onDone: (id: string) => void
}) {
  const cfg = PRIORITY_CONFIG[lead.priority]
  const [showModal, setShowModal] = useState(false)
  const [done, setDone] = useState(false)

  if (done) return null

  return (
    <>
      <div className={`bg-[#1a1a2e] border rounded-xl p-4 space-y-3 ${cfg.border}`}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              {cfg.emoji} {cfg.label}
            </span>
            <span className="font-semibold text-white">{lead.name}</span>
            <span className="text-slate-400 text-sm">·</span>
            <span className="text-slate-400 text-sm">{lead.stageName}</span>
          </div>
        </div>

        {/* Phone + last contact */}
        <div className="flex items-center gap-3 text-sm text-slate-400">
          {lead.phone && <span>{lead.phone}</span>}
          {lead.lastMessageAgo && (
            <>
              <span>·</span>
              <span className={lead.priority === 'HOT' ? 'text-red-400 font-medium' : ''}>
                Last message: {lead.lastMessageAgo}
              </span>
            </>
          )}
          {!lead.lastMessageAt && !lead.lastMessage && (
            <span className="text-yellow-400">Never contacted</span>
          )}
        </div>

        {/* Last message preview */}
        {lead.lastMessage && (
          <div className="text-sm text-slate-400 italic line-clamp-2 leading-relaxed">
            "{lead.lastMessage}"
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1">
          {lead.conversationId && (
            <a
              href={`https://app.gohighlevel.com/v2/location/${`qhOziWzmOO7mYbl3U7tm`}/conversations/${lead.conversationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              📋 View Conversation
            </a>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="text-xs bg-[#d4a847]/20 hover:bg-[#d4a847]/30 text-[#d4a847] px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            ✍️ Draft Reply
          </button>
          <button
            onClick={() => {
              setDone(true)
              onDone(lead.id)
            }}
            className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            ✅ Mark Done
          </button>
        </div>
      </div>

      {showModal && (
        <DraftReplyModal lead={lead} onClose={() => setShowModal(false)} isAdmin={isAdmin} />
      )}
    </>
  )
}

export default function LeadsClient({ isAdmin }: Props) {
  const [leads, setLeads] = useState<PrioritizedLead[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'HOT' | 'WARM' | 'FOLLOW-UP' | 'ALL'>('HOT')
  const [doneLead, setDoneLeads] = useState<Set<string>>(new Set())

  const fetchLeads = useCallback(async (refresh = false) => {
    setLoading(true)
    setError('')
    try {
      const url = `/api/crm/leads-priority${refresh ? '?refresh=true' : ''}`
      const res = await fetch(url)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to load leads')
        return
      }
      const data = await res.json()
      setLeads(data.leads || [])
      setFetchedAt(data.fetchedAt)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  function handleDone(id: string) {
    setDoneLeads(prev => { const next = new Set(prev); next.add(id); return next })
  }

  function timeAgoFromFetchedAt() {
    if (!fetchedAt) return null
    const diff = Date.now() - new Date(fetchedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins === 1) return '1 min ago'
    return `${mins} min ago`
  }

  const visibleLeads = leads.filter(l => !doneLead.has(l.id))

  const hotLeads = visibleLeads.filter(l => l.priority === 'HOT')
  const warmLeads = visibleLeads.filter(l => l.priority === 'WARM')
  const followupLeads = visibleLeads.filter(l => l.priority === 'FOLLOW-UP')

  const tabLeads =
    activeTab === 'HOT' ? hotLeads
    : activeTab === 'WARM' ? warmLeads
    : activeTab === 'FOLLOW-UP' ? followupLeads
    : visibleLeads

  const tabs = [
    { key: 'HOT' as const, emoji: '🔴', label: 'HOT', count: hotLeads.length },
    { key: 'WARM' as const, emoji: '🟡', label: 'WARM', count: warmLeads.length },
    { key: 'FOLLOW-UP' as const, emoji: '🟠', label: 'FOLLOW-UP', count: followupLeads.length },
    { key: 'ALL' as const, emoji: '⬜', label: 'ALL', count: visibleLeads.length },
  ]

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-slate-700 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-amber-400 font-bold text-xl">◆ Quarriva</Link>
              <span className="text-slate-600">/</span>
              <Link href="/crm" className="text-slate-400 hover:text-white transition-colors">CRM</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-semibold">Lead Priority Queue</span>
            </div>
            <div className="flex items-center gap-3">
              {fetchedAt && (
                <span className="text-xs text-slate-500">
                  Synced {timeAgoFromFetchedAt()}
                </span>
              )}
              <button
                onClick={() => fetchLeads(true)}
                disabled={loading}
                className="text-xs bg-[#d4a847]/20 hover:bg-[#d4a847]/30 text-[#d4a847] border border-[#d4a847]/30 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {loading ? '⟳ Syncing…' : '⟳ Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Priority summary strip */}
        {!loading && leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`rounded-xl p-3 text-center border transition-all ${
                  activeTab === t.key
                    ? 'bg-[#d4a847]/10 border-[#d4a847]/40 text-[#d4a847]'
                    : 'bg-[#1a1a2e] border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl font-bold">{t.count}</div>
                <div className="text-xs mt-0.5">{t.emoji} {t.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-[#1a1a2e] border border-slate-700 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === t.key
                  ? 'bg-[#d4a847]/20 text-[#d4a847]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.emoji} {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Leads */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-3xl mb-3 animate-pulse">⟳</div>
            <div>Fetching leads from GHL…</div>
            <div className="text-xs mt-1 text-slate-600">This may take 10–20 seconds</div>
          </div>
        ) : tabLeads.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">
              {activeTab === 'HOT' ? '🎉' : activeTab === 'WARM' ? '✅' : '📭'}
            </div>
            <div className="font-medium">
              {activeTab === 'HOT' ? 'No hot leads right now!' : `No ${activeTab} leads`}
            </div>
            <div className="text-xs mt-1 text-slate-600">
              {activeTab === 'HOT' && 'All inbound messages have been replied to.'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tabLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} isAdmin={isAdmin} onDone={handleDone} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
