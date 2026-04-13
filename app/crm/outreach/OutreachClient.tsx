'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type OutreachItem = {
  id: string
  contact_name: string
  phone: string
  stage_name: string   // normalized: both tables use stage_name now
  value: number
  message: string
  status: string
  created_at: string
  contact_id?: string
  conversation_id?: string
  context?: string
  source: 'outreach_queue' | 'staged_messages'
}

type ContextMessage = {
  direction: string
  body: string
  sent_at: string
  channelLabel?: string
}

const STAGE_META: Record<string, { label: string; color: string; emoji: string }> = {
  quote_sent:            { label: 'Quote Follow-up',  color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',     emoji: '💰' },
  ready_for_templating:  { label: 'Templating Ready', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     emoji: '📅' },
  templating_done:       { label: 'Templating Done',  color: 'bg-green-500/20 text-green-400 border-green-500/30',  emoji: '🎉' },
  sketch_received:       { label: 'Sketch Received',  color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',     emoji: '📐' },
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-yellow-500/40 bg-yellow-500/5',
  sent:    'border-green-700/40 bg-green-900/10',
  skipped: 'border-slate-600 bg-slate-800/20',
}

const STATUS_TABS = ['pending', 'sent', 'skipped', 'all'] as const

function OutreachCard({
  item,
  onUpdated,
}: {
  item: OutreachItem
  onUpdated: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editedMessage, setEditedMessage] = useState(item.message)
  const [liveMessages, setLiveMessages] = useState<ContextMessage[] | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAi, setShowAi] = useState(false)
  const [localStatus, setLocalStatus] = useState(item.status)
  const [rating, setRating] = useState<'good' | 'bad' | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSaved, setFeedbackSaved] = useState(false)

  const stageMeta = STAGE_META[item.stage_name] || STAGE_META[item.stage_name?.toLowerCase().replace(/ /g,'_')] || { label: item.stage_name, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', emoji: '📨' }
  const cardStyle = STATUS_STYLES[localStatus] || STATUS_STYLES.pending
  const isDone = localStatus === 'sent' || localStatus === 'skipped'

  // For staged_messages: use contactId (preferred) or conversationId — both are stored in DB
  // For outreach_queue: use our dedicated proxy that does phone→contactId lookup server-side
  const conversationUrl = item.source === 'staged_messages'
    ? `/api/crm/conversation?${item.contact_id ? `contactId=${encodeURIComponent(item.contact_id)}` : `conversationId=${encodeURIComponent(item.conversation_id ?? '')}`}`
    : `/api/outreach-queue/${item.id}/conversation`

  const fetchThread = useCallback(async () => {
    if (liveMessages !== null) return
    setLoadingThread(true)
    try {
      const r = await fetch(conversationUrl)
      const d = await r.json()
      setLiveMessages(d.messages || [])
    } catch {
      setLiveMessages([])
    } finally {
      setLoadingThread(false)
    }
  }, [conversationUrl, liveMessages])

  const refreshThread = useCallback(async () => {
    setRefreshing(true)
    try {
      const refreshUrl = conversationUrl + (conversationUrl.includes('?') ? '&' : '?') + 'refresh=true'
      const r = await fetch(refreshUrl)
      const d = await r.json()
      setLiveMessages(d.messages || [])
      setNewMsgCount(d.newCount || 0)
    } catch {}
    finally { setRefreshing(false) }
  }, [conversationUrl])

  function toggleExpand() {
    if (!expanded) fetchThread()
    setExpanded(e => !e)
  }

  async function handleSend() {
    setLoading('sending')
    setError('')
    try {
      let r: Response
      if (item.source === 'staged_messages') {
        // Use existing staged_messages approve flow
        r = await fetch(`/api/crm/staged/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved', message: editedMessage }),
        })
      } else {
        r = await fetch(`/api/outreach-queue/${item.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: editedMessage }),
        })
      }
      const d = await r.json()
      if (d.success || d.id || r.ok) {
        setLocalStatus('sent')
        onUpdated()
      } else {
        setError(d.error || 'Send failed')
      }
    } catch { setError('Network error') }
    finally { setLoading('') }
  }

  async function handleSkip() {
    setLoading('skipping')
    try {
      if (item.source === 'staged_messages') {
        await fetch(`/api/crm/staged/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        })
      } else {
        await fetch(`/api/outreach-queue/${item.id}/skip`, { method: 'POST' })
      }
      setLocalStatus('skipped')
      onUpdated()
    } catch { setError('Network error') }
    finally { setLoading('') }
  }

  async function handleAiRewrite() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const thread = (liveMessages || []).slice(-6).map(m =>
        `${m.direction === 'inbound' ? 'Lead' : 'Us'}: ${m.body}`
      ).join('\n')

      const r = await fetch('/api/crm/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: item.contact_name,
          stage: item.stage_name,
          currentMessage: editedMessage,
          thread,
          instruction: aiPrompt,
        }),
      })

      const d = await r.json()
      if (d.message) {
        setEditedMessage(d.message)
        setAiPrompt('')
        setShowAi(false)
      } else {
        setError(d.error || 'AI rewrite failed')
      }
    } catch { setError('AI error') }
    finally { setAiLoading(false) }
  }

  async function submitFeedback(r: 'good' | 'bad', text?: string) {
    setRating(r)
    if (r === 'bad' && !text) {
      setShowFeedback(true)
      return
    }
    try {
      await fetch('/api/message-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: item.id,
          source: item.source,
          contact_name: item.contact_name,
          stage_name: item.stage_name,
          message: editedMessage,
          rating: r,
          feedback_text: text || null,
        }),
      })
      setFeedbackSaved(true)
      setShowFeedback(false)
    } catch {}
  }

  function formatTime(ts: string) {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-all ${cardStyle}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{item.contact_name}</span>
            {item.value > 0 && (
              <span className="text-amber-400 text-xs font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                ${item.value.toLocaleString()}
              </span>
            )}
            <span className="text-slate-400 text-sm">{item.phone}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stageMeta.color}`}>
              {stageMeta.emoji} {stageMeta.label}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{formatTime(item.created_at)}</div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${
          localStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
          localStatus === 'sent'    ? 'bg-green-500/20 text-green-400' :
          localStatus === 'skipped' ? 'bg-slate-700 text-slate-400' :
          'bg-slate-700 text-slate-400'
        }`}>
          {localStatus}
        </span>
      </div>

      {/* Thread toggle */}
      <div>
        <button
          onClick={toggleExpand}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors font-medium"
        >
          <span>{expanded ? '▲' : '▼'}</span>
          <span>{expanded ? 'Hide thread' : 'Show last messages'}</span>
          {loadingThread && <span className="text-slate-500 animate-pulse">loading…</span>}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Conversation Thread</span>
              <button
                onClick={refreshThread}
                disabled={refreshing || loadingThread}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-50"
              >
                {refreshing ? '⟳ Checking...' : '🔄 Check for new'}
                {newMsgCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{newMsgCount} new</span>
                )}
              </button>
            </div>

            {loadingThread && (
              <div className="text-xs text-slate-500 text-center py-3 animate-pulse">Fetching conversation from GHL…</div>
            )}
            {!loadingThread && liveMessages?.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-3">No messages found in GHL</div>
            )}
            {!loadingThread && liveMessages?.map((m, i) => {
              const isInbound = m.direction === 'inbound'
              const date = m.sent_at ? new Date(m.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
              return (
                <div key={i} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                    isInbound ? 'bg-slate-700 text-white rounded-tl-none' : 'bg-amber-600/30 text-amber-100 rounded-tr-none'
                  }`}>
                    <div className={`text-[10px] mb-1 ${isInbound ? 'text-slate-400' : 'text-amber-400/70'}`}>
                      {isInbound ? '← Lead' : '→ Us'} {date && `· ${date}`}
                    </div>
                    <div className="leading-relaxed">{m.body}</div>
                  </div>
                </div>
              )
            })}

            {!loadingThread && liveMessages && liveMessages.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 border-t border-dashed border-amber-500/30"/>
                <span className="text-[10px] text-amber-500/60 whitespace-nowrap">↓ draft below</span>
                <div className="flex-1 border-t border-dashed border-amber-500/30"/>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Draft message */}
      {!isDone ? (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Draft Message</label>
          <textarea
            value={editedMessage}
            onChange={e => setEditedMessage(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300">{item.message}</div>
      )}

      {/* Thumbs rating */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">Rate this draft:</span>
        <button
          onClick={() => submitFeedback('good')}
          className={`text-lg transition-all hover:scale-110 ${
            rating === 'good' ? 'opacity-100' : 'opacity-40 hover:opacity-80'
          }`}
          title="Good message"
        >👍</button>
        <button
          onClick={() => submitFeedback('bad')}
          className={`text-lg transition-all hover:scale-110 ${
            rating === 'bad' ? 'opacity-100' : 'opacity-40 hover:opacity-80'
          }`}
          title="Bad message"
        >👎</button>
        {feedbackSaved && (
          <span className="text-xs text-green-400">✓ Feedback saved</span>
        )}
      </div>

      {/* Bad feedback form */}
      {showFeedback && (
        <div className="space-y-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <label className="block text-xs text-red-400 font-medium">What was wrong with this message?</label>
          <textarea
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            rows={2}
            placeholder="e.g. Too generic, wrong tone, missing context, wrong stage..."
            className="w-full bg-slate-900 border border-red-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400 resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => submitFeedback('bad', feedbackText)}
              className="bg-red-600/40 hover:bg-red-600/60 text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Submit Feedback
            </button>
            <button
              onClick={() => { setShowFeedback(false); setRating(null) }}
              className="text-slate-500 text-xs hover:text-slate-300 px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AI Rewrite */}
      {!isDone && (
        <div>
          <button
            onClick={() => setShowAi(a => !a)}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            ✨ {showAi ? 'Hide AI rewrite' : 'Ask AI to rewrite'}
          </button>
          {showAi && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiRewrite()}
                placeholder='e.g. "make it shorter" or "add urgency" or "more casual"'
                className="w-full bg-slate-900 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={handleAiRewrite}
                disabled={aiLoading || !aiPrompt.trim()}
                className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-300 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {aiLoading ? '⟳ Rewriting...' : '✨ Rewrite'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 rounded px-3 py-2">{error}</div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={!!loading}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            {loading === 'sending' ? '⏳ Sending...' : '✓ Approve & Send'}
          </button>
          <button
            onClick={handleSkip}
            disabled={!!loading}
            className="px-4 bg-red-600/30 hover:bg-red-600/50 text-red-400 text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page client ────────────────────────────────────────────────────────

export default function OutreachClient({ initialQueue }: { initialQueue: OutreachItem[] }) {
  const router = useRouter()
  const [queue, setQueue] = useState(initialQueue)
  const [activeTab, setActiveTab] = useState<string>('pending')
  const [sendAllLoading, setSendAllLoading] = useState(false)
  const [sendAllResults, setSendAllResults] = useState<{ name: string; status: string }[]>([])

  const refresh = useCallback(() => {
    router.refresh()
    fetch('/api/outreach-queue')
      .then(r => r.json())
      .then(d => { if (d.queue) setQueue(d.queue) })
      .catch(() => {})
  }, [router])

  const filtered = queue.filter(i => activeTab === 'all' || i.status === activeTab)
  const pendingCount = queue.filter(i => i.status === 'pending').length

  async function sendAll() {
    if (!confirm(`Send all ${pendingCount} pending messages now?`)) return
    setSendAllLoading(true)
    try {
      const r = await fetch('/api/outreach-queue/send-all', { method: 'POST' })
      const d = await r.json()
      setSendAllResults(d.results || [])
      refresh()
    } catch (e) { alert('Error: ' + String(e)) }
    finally { setSendAllLoading(false) }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Outreach Queue</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review conversation context, edit messages, and approve to send via SMS.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{queue.filter(i => i.status === 'pending').length}</div>
          <div className="text-xs text-slate-400 mt-1">Pending</div>
        </div>
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{queue.filter(i => i.status === 'sent').length}</div>
          <div className="text-xs text-slate-400 mt-1">Sent</div>
        </div>
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-slate-400">{queue.filter(i => i.status === 'skipped').length}</div>
          <div className="text-xs text-slate-400 mt-1">Skipped</div>
        </div>
      </div>

      {/* Message list */}
      <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Messages</h2>
            {pendingCount > 0 && (
              <button
                onClick={sendAll}
                disabled={sendAllLoading}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                {sendAllLoading ? '⏳ Sending...' : `🚀 Send All (${pendingCount})`}
              </button>
            )}
          </div>
          {/* Tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map(tab => {
              const count = tab === 'all' ? queue.length : queue.filter(i => i.status === tab).length
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab} ({count})
                  {tab === 'pending' && count > 0 && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Send all results */}
          {sendAllResults.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-1">
              {sendAllResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span>{r.status === 'sent' ? '✅' : '❌'}</span>
                  <span className="text-slate-300">{r.name}</span>
                  <span className={r.status === 'sent' ? 'text-green-400' : 'text-red-400'}>{r.status}</span>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-3xl mb-2">📭</div>
              <div>No messages in this view</div>
            </div>
          ) : (
            filtered.map(item => (
              <OutreachCard key={item.id} item={item} onUpdated={refresh} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
