'use client'

import { useState } from 'react'
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

  const contextMessages: ContextMessage[] = (() => {
    try {
      return msg.context ? JSON.parse(msg.context) : []
    } catch {
      return []
    }
  })()

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

      {/* Context messages */}
      {contextMessages.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? '▲ Hide context' : `▼ Show context (${Math.min(contextMessages.length, 3)} msgs)`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5 border-l-2 border-slate-600 pl-3">
              {contextMessages.slice(0, 5).map((ctx, i) => (
                <div key={i} className={`text-xs rounded p-2 ${ctx.direction === 'inbound' ? 'bg-slate-700' : 'bg-slate-800'}`}>
                  <span className={`font-medium ${ctx.direction === 'inbound' ? 'text-blue-400' : 'text-green-400'}`}>
                    {ctx.direction === 'inbound' ? '← Lead' : '→ Us'}
                  </span>
                  <span className="text-slate-400 ml-2">{ctx.body}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
