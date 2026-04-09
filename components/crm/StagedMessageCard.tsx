'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const STAGE_COLORS: Record<string, string> = {
  new_lead: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  waiting_for_response: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  engaging: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  qualified: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  sketch_received: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  quote_sent: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  choosing_material: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-yellow-500/40 bg-yellow-500/5',
  approved: 'border-green-500/40 bg-green-500/5',
  rejected: 'border-red-500/40 bg-red-500/5',
  sent: 'border-green-700/40 bg-green-900/10',
  edited: 'border-blue-500/40 bg-blue-500/5',
}

interface ContextMessage {
  direction: string
  body: string
  sent_at: string
}

interface StagedMessage {
  id: string
  contact_id: string
  contact_name: string | null
  phone: string | null
  conversation_id: string | null
  message: string
  status: string
  stage_name: string | null
  context: string | null
  created_at: string
  notes: string | null
}

interface StagedMessageCardProps {
  msg: StagedMessage
  isAdmin: boolean
  onUpdated: () => void
}

export default function StagedMessageCard({ msg, isAdmin, onUpdated }: StagedMessageCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [editedMessage, setEditedMessage] = useState(msg.message)
  const [notes, setNotes] = useState(msg.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [liveMessages, setLiveMessages] = useState<(ContextMessage & { channelLabel?: string; channelType?: string })[] | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [composeText, setComposeText] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState('')
  const [composeSuccess, setComposeSuccess] = useState('')

  const contextMessages: ContextMessage[] = (() => {
    try {
      return msg.context ? JSON.parse(msg.context) : []
    } catch {
      return []
    }
  })()

  const fetchThread = useCallback(async () => {
    if (liveMessages !== null) return // already loaded
    setLoadingThread(true)
    try {
      const params = new URLSearchParams()
      // Always use contactId to fetch ALL conversation threads (SMS + FB + Email)
      if (msg.contact_id) params.set('contactId', msg.contact_id)
      else if (msg.conversation_id) params.set('conversationId', msg.conversation_id)
      const res = await fetch(`/api/crm/conversation?${params}`)
      const data = await res.json()
      setLiveMessages(data.messages || [])
    } catch {
      setLiveMessages([])
    } finally {
      setLoadingThread(false)
    }
  }, [msg.conversation_id, msg.contact_id, liveMessages])

  const refreshThread = useCallback(async () => {
    setRefreshing(true)
    try {
      const lastMsg = liveMessages?.[liveMessages.length - 1]
      const since = lastMsg?.sent_at || ''
      const params = new URLSearchParams()
      // Always use contactId to get all channels
      if (msg.contact_id) params.set('contactId', msg.contact_id)
      else if (msg.conversation_id) params.set('conversationId', msg.conversation_id)
      params.set('refresh', 'true')
      if (since) params.set('since', String(since))
      const res = await fetch(`/api/crm/conversation?${params}`)
      const data = await res.json()
      setLiveMessages(data.messages || [])
      setNewMsgCount(data.newCount || 0)
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }, [msg.conversation_id, msg.contact_id, liveMessages])

  function toggleExpand() {
    if (!expanded) fetchThread()
    setExpanded(e => !e)
  }

  async function handleStage() {
    if (!composeText.trim()) return
    setComposeSending(true)
    setComposeError('')
    setComposeSuccess('')
    try {
      const res = await fetch('/api/crm/staged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: msg.contact_id,
          contact_name: msg.contact_name,
          phone: msg.phone,
          conversation_id: msg.conversation_id,
          message: composeText.trim(),
        }),
      })
      if (res.ok) {
        setComposeText('')
        setComposeSuccess('Staged ✓')
        setTimeout(() => setComposeSuccess(''), 2500)
        onUpdated()
      } else {
        const d = await res.json()
        setComposeError(d.error || 'Failed to stage')
      }
    } catch {
      setComposeError('Network error')
    } finally {
      setComposeSending(false)
    }
  }

  async function handleSendNow() {
    if (!composeText.trim()) return
    setComposeSending(true)
    setComposeError('')
    setComposeSuccess('')
    try {
      const res = await fetch('/api/crm/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: msg.contact_id,
          conversationId: msg.conversation_id,
          message: composeText.trim(),
          action: 'send',
          confirmed: true,
        }),
      })
      if (res.ok) {
        setComposeText('')
        setComposeSuccess('Sent ✓')
        setTimeout(() => setComposeSuccess(''), 2500)
        if (expanded) refreshThread()
      } else {
        const d = await res.json()
        setComposeError(d.error || 'Failed to send')
      }
    } catch {
      setComposeError('Network error')
    } finally {
      setComposeSending(false)
    }
  }

  const stageColor = STAGE_COLORS[msg.stage_name || ''] || STAGE_COLORS.default
  const cardStyle = STATUS_STYLES[msg.status] || STATUS_STYLES.pending

  const isDone = msg.status === 'sent' || msg.status === 'rejected'

  async function updateStatus(status: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/crm/staged/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          message: editedMessage !== msg.message ? editedMessage : undefined,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Failed to update status`)
      } else {
        onUpdated()
      }
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  function formatTime(ts: string) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-all ${cardStyle}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{msg.contact_name || 'Unknown Contact'}</span>
            {msg.phone && <span className="text-slate-400 text-sm">{msg.phone}</span>}
            {msg.stage_name && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stageColor}`}>
                {msg.stage_name.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{formatTime(msg.created_at)}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
            msg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
            msg.status === 'sent' ? 'bg-green-500/20 text-green-400' :
            msg.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
            msg.status === 'edited' ? 'bg-blue-500/20 text-blue-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {msg.status}
          </span>
          <a
            href={`/crm/compose/${msg.contact_id}`}
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
          >
            View Lead →
          </a>
        </div>
      </div>

      {/* Conversation thread — collapsible, fetches live from GHL */}
      <div>
        <button
          onClick={toggleExpand}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors font-medium"
        >
          <span>{expanded ? '▲' : '▼'}</span>
          <span>{expanded ? 'Hide thread' : 'Show last 10 messages'}</span>
          {loadingThread && <span className="text-slate-500 animate-pulse">loading…</span>}
        </button>
        {expanded && (
          <div className="mt-3 space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-900/50">
            {/* Refresh header */}
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
            {!loadingThread && liveMessages && liveMessages.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-3">No messages found in GHL</div>
            )}
            {!loadingThread && liveMessages && liveMessages.map((m, i) => {
              const isInbound = m.direction === 'inbound'
              const date = m.sent_at ? new Date(m.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
              const badge = m.channelLabel === 'FB' ? '📘' : m.channelLabel === 'Email' ? '📧' : null
              return (
                <div key={i} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                    isInbound ? 'bg-slate-700 text-white rounded-tl-none' : 'bg-amber-600/30 text-amber-100 rounded-tr-none'
                  }`}>
                    <div className={`text-[10px] mb-1 ${isInbound ? 'text-slate-400' : 'text-amber-400/70'} flex items-center gap-1`}>
                      <span>{isInbound ? '← Lead' : '→ Us'} {date && `· ${date}`}</span>
                      {badge && <span className="text-slate-500 ml-0.5">{badge}</span>}
                    </div>
                    <div className="leading-relaxed">{m.body}</div>
                  </div>
                </div>
              )
            })}
            {/* Divider showing where draft will be sent */}
            {!loadingThread && liveMessages && liveMessages.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 border-t border-dashed border-amber-500/30"/>
                <span className="text-[10px] text-amber-500/60 whitespace-nowrap">↓ draft message below</span>
                <div className="flex-1 border-t border-dashed border-amber-500/30"/>
              </div>
            )}

            {/* Compose box */}
            <div className="mt-3 border-t border-slate-700 pt-3 space-y-2">
              <textarea
                value={composeText}
                onChange={e => setComposeText(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs resize-none h-14 focus:outline-none focus:border-[#d4a847]"
              />
              {composeError && (
                <div className="text-red-400 text-xs">{composeError}</div>
              )}
              {composeSuccess && (
                <div className="text-green-400 text-xs">{composeSuccess}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleStage}
                  disabled={!composeText.trim() || composeSending}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                >
                  {composeSending ? '…' : '📋 Stage'}
                </button>
                <button
                  onClick={handleSendNow}
                  disabled={!composeText.trim() || composeSending}
                  className="flex-1 bg-[#d4a847] hover:bg-yellow-400 disabled:opacity-50 text-black text-xs font-bold py-1.5 rounded-lg transition-colors"
                >
                  {composeSending ? '…' : '⚡ Send Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message draft */}
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
        <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300">
          {msg.message}
        </div>
      )}

      {/* Notes */}
      {!isDone && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reason for edit, flags, etc."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      )}

      {msg.notes && isDone && (
        <div className="text-xs text-slate-500 italic">Note: {msg.notes}</div>
      )}

      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 rounded px-3 py-2">{error}</div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => updateStatus('approved')}
              disabled={loading}
              className="flex-1 min-w-[80px] bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              {loading ? '…' : '✓ Approve & Send'}
            </button>
          )}
          {!isAdmin && (
            <button
              onClick={() => updateStatus('edited')}
              disabled={loading}
              className="flex-1 min-w-[80px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              {loading ? '…' : '✏ Flag for Send'}
            </button>
          )}
          <button
            onClick={() => updateStatus('rejected')}
            disabled={loading}
            className="px-4 bg-red-600/30 hover:bg-red-600/50 text-red-400 text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
