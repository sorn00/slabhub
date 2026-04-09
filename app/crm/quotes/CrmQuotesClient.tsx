'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

// --- Types ---

interface StoneItem {
  stoneId: string
  stoneName: string
  stoneImage?: string
}

interface QuoteRequest {
  id: number
  user_id?: number
  stone_id?: string
  stone_name?: string
  customer_name: string
  phone?: string
  sqft_estimate?: number | null
  notes?: string | null
  layout?: string | null
  sink_type?: string | null
  status: string
  created_at: string
  user_name?: string
  user_email?: string
  quote_file?: string | null
  quote_file_name?: string | null
  quote_file_uploaded_at?: string | null
  stones?: StoneItem[] | null
  contactId?: string | null
}

interface GhlLead {
  id: string
  customerName: string
  email?: string
  phone?: string
  stageName: string
  contactId: string
  conversationId?: string
  lastMessage?: string
  lastMessageDirection?: string
  hasStagedDraft?: boolean
  stagedDraftId?: string
  createdAt: string
}

// --- Constants ---

const STATUS_BADGE: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  quoted:  'text-green-400 bg-green-400/10 border-green-400/30',
  complete:'text-blue-400 bg-blue-400/10 border-blue-400/30',
  closed:  'text-slate-400 bg-slate-700 border-slate-600',
}

const STAGE_BADGE: Record<string, string> = {
  'Qualified':                     'text-purple-300 bg-purple-500/10 border-purple-500/30',
  'Sketch / Measurements Received':'text-amber-300 bg-amber-500/10 border-amber-500/30',
  'Ready for Templating':          'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
}

const GHL_APP_BASE = 'https://app.gohighlevel.com'
const GHL_LOC = 'qhOziWzmOO7mYbl3U7tm'

// --- Upload Button ---

function UploadButton({
  requestId,
  onUploaded,
}: {
  requestId: number
  onUploaded: (filename: string, originalName: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/quote-requests/${requestId}/upload`, { method: 'POST', body: form })
    setUploading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Upload failed')
      return
    }
    const data = await res.json()
    onUploaded(data.filename, data.original_name || file.name)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
        onChange={handleFile}
        className="hidden"
        id={`upload-${requestId}`}
      />
      <label
        htmlFor={`upload-${requestId}`}
        className={`inline-flex items-center gap-2 cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          uploading
            ? 'opacity-50 cursor-not-allowed border-slate-600 text-slate-500'
            : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
        }`}
      >
        {uploading ? '↑ Uploading…' : '↑ Upload Quote'}
      </label>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// --- GHL Lead Card ---

function GhlLeadCard({ lead, onViewThread }: { lead: GhlLead; onViewThread: (contactId: string) => void }) {
  const [draftMessage, setDraftMessage] = useState('')
  const [stagedId, setStagedId] = useState<string | null>(null)
  const [isStaging, setIsStaging] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [cardStatus, setCardStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/crm/staged?contactId=${lead.contactId}`)
      .then(r => r.json())
      .then((data: Array<{ id: string; message: string; status: string }>) => {
        const pending = data.find(m => m.status === 'pending')
        if (pending) setDraftMessage(pending.message)
        setStagedId(pending?.id || null)
      })
      .catch(() => {})
  }, [lead.contactId])

  const handleStage = async () => {
    if (!draftMessage.trim()) return
    setIsStaging(true)
    setCardStatus(null)
    try {
      if (stagedId) {
        // Update existing staged message
        const res = await fetch(`/api/crm/staged/${stagedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending', message: draftMessage }),
        })
        if (res.ok) {
          setCardStatus({ type: 'success', text: '📋 Draft updated' })
        } else {
          setCardStatus({ type: 'error', text: 'Stage failed' })
        }
      } else {
        // Create new staged message
        const res = await fetch('/api/crm/staged', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: lead.contactId,
            conversation_id: lead.conversationId || '',
            message: draftMessage,
            contact_name: lead.customerName,
            phone: lead.phone || '',
            stage_name: lead.stageName,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setStagedId(data.id || null)
          setCardStatus({ type: 'success', text: '📋 Staged for review' })
        } else {
          setCardStatus({ type: 'error', text: data.error || 'Stage failed' })
        }
      }
    } catch {
      setCardStatus({ type: 'error', text: 'Network error' })
    } finally {
      setIsStaging(false)
      setTimeout(() => setCardStatus(null), 3000)
    }
  }

  const handleSend = async () => {
    if (!draftMessage.trim() || !lead.conversationId) return
    setIsSending(true)
    setCardStatus(null)
    try {
      const res = await fetch('/api/crm/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: lead.contactId,
          conversationId: lead.conversationId,
          message: draftMessage,
          contactName: lead.customerName,
          phone: lead.phone || '',
          action: 'send',
          confirmed: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCardStatus({ type: 'success', text: '⚡ Sent!' })
        setDraftMessage('')
        setStagedId(null)
      } else {
        setCardStatus({ type: 'error', text: data.error || 'Send failed' })
      }
    } catch {
      setCardStatus({ type: 'error', text: 'Network error' })
    } finally {
      setIsSending(false)
      setTimeout(() => setCardStatus(null), 3000)
    }
  }

  const stageBadgeClass = STAGE_BADGE[lead.stageName] || 'text-slate-300 bg-slate-700 border-slate-600'
  const ghlConvUrl = lead.conversationId
    ? `${GHL_APP_BASE}/v2/location/${GHL_LOC}/conversations/${lead.conversationId}`
    : `${GHL_APP_BASE}/v2/location/${GHL_LOC}/contacts/${lead.contactId}`

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-white text-base">{lead.customerName}</span>
            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border font-medium ${stageBadgeClass}`}>
              {lead.stageName}
            </span>
            {(lead.hasStagedDraft || stagedId) && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 font-medium">
                📋 Has Draft
              </span>
            )}
          </div>
          <div className="flex gap-3 flex-wrap text-sm text-slate-400">
            {lead.phone && <span>{lead.phone}</span>}
            {lead.email && <span className="hidden sm:inline">{lead.email}</span>}
            <span className="text-slate-500">{timeAgo(lead.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onViewThread(lead.contactId)}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1 rounded"
          >
            💬 Conversation
          </button>
          <a
            href={ghlConvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            View in GHL →
          </a>
        </div>
      </div>

      {lead.lastMessage && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              lead.lastMessageDirection === 'inbound'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {lead.lastMessageDirection === 'inbound' ? '← Inbound' : '→ Outbound'}
            </span>
          </div>
          <p className="text-slate-300 text-sm line-clamp-2">{lead.lastMessage}</p>
        </div>
      )}

      {/* Inline message draft */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        {cardStatus && (
          <p className={`text-xs mb-2 ${cardStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {cardStatus.text}
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={draftMessage}
            onChange={e => setDraftMessage(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none h-14 focus:outline-none focus:border-[#d4a847] placeholder-slate-500"
            placeholder="Message..."
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleStage}
              disabled={isStaging || !draftMessage.trim()}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {isStaging ? '...' : '📋 Stage'}
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !draftMessage.trim() || !lead.conversationId}
              className="text-xs bg-[#d4a847] hover:bg-yellow-400 text-black font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              title={!lead.conversationId ? 'No conversation ID — open in GHL first' : ''}
            >
              {isSending ? '...' : '⚡ Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Quarriva Request Card ---

function QuarrivaCard({
  qr,
  onStatusChange,
  onUploaded,
  onViewThread,
}: {
  qr: QuoteRequest
  onStatusChange: (id: number, status: string) => void
  onUploaded: (id: number, filename: string, originalName: string) => void
  onViewThread: (contactId: string) => void
}) {
  const displayStones: StoneItem[] =
    qr.stones && qr.stones.length > 0
      ? qr.stones
      : [{ stoneId: qr.stone_id || '', stoneName: qr.stone_name || qr.stone_id || '', stoneImage: '' }]

  return (
    <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="font-bold text-white text-lg">{qr.customer_name}</span>
            <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${STATUS_BADGE[qr.status] || STATUS_BADGE.pending}`}>
              {qr.status}
            </span>
            <span className="text-slate-500 text-xs">#{qr.id}</span>
          </div>
          <div className="flex gap-4 flex-wrap text-sm text-slate-400">
            {qr.phone && <span>{qr.phone}</span>}
            {qr.user_email && <span>{qr.user_email}</span>}
            <span>{new Date(qr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
        <select
          value={qr.status}
          onChange={e => onStatusChange(qr.id, e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-400 shrink-0"
        >
          <option value="pending">Pending</option>
          <option value="quoted">Quoted</option>
          <option value="complete">Complete</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Stones */}
      <div className="mb-4">
        <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">
          {displayStones.length} Stone{displayStones.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-3 flex-wrap">
          {displayStones.map(s => (
            <div key={s.stoneId} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
              {s.stoneImage ? (
                <img
                  src={s.stoneImage}
                  alt={s.stoneName}
                  className="w-10 h-10 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-slate-500">◆</div>
              )}
              <div>
                <p className="text-white text-sm font-medium leading-tight">{s.stoneName}</p>
                <p className="text-slate-500 text-xs">{s.stoneId}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Job details */}
      <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
        {qr.sqft_estimate && <span>📐 {qr.sqft_estimate} sqft</span>}
        {qr.layout && <span>🔲 {qr.layout}</span>}
        {qr.sink_type && qr.sink_type !== 'none' && <span>🚰 {qr.sink_type} sink</span>}
      </div>

      {qr.notes && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-slate-400 text-sm italic">&ldquo;{qr.notes}&rdquo;</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-700/50">
        {qr.quote_file ? (
          <a
            href={`/api/quotes/download/${qr.quote_file}`}
            download={qr.quote_file_name || 'quote.pdf'}
            className="inline-flex items-center gap-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            ⬇ {qr.quote_file_name || 'Download Quote'}
          </a>
        ) : null}
        <UploadButton
          requestId={qr.id}
          onUploaded={(filename, originalName) => onUploaded(qr.id, filename, originalName)}
        />
        {qr.phone && (
          <a
            href={`tel:${qr.phone}`}
            className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
          >
            📞 Call
          </a>
        )}
        {qr.contactId && (
          <button
            onClick={() => onViewThread(qr.contactId!)}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1.5 rounded-lg transition-colors"
          >
            💬 Conversation
          </button>
        )}
      </div>
    </div>
  )
}

// --- Main Component ---

type TabKey = 'needs-quote' | 'website' | 'all'

export default function CrmQuotesClient({
  initialRequests,
  ghlLeads: initialGhlLeads,
}: {
  initialRequests: QuoteRequest[]
  ghlLeads: GhlLead[]
}) {
  const [requests, setRequests] = useState<QuoteRequest[]>(initialRequests)
  const [ghlLeads] = useState<GhlLead[]>(initialGhlLeads)
  const [activeTab, setActiveTab] = useState<TabKey>('needs-quote')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [threadContactId, setThreadContactId] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [composeMessage, setComposeMessage] = useState('')
  const [composeStagedId, setComposeStagedId] = useState<string | null>(null)
  const [composeStatus, setComposeStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [composeSending, setComposeSending] = useState(false)
  const [composeStaging, setComposeStaging] = useState(false)

  const openThread = async (contactId: string) => {
    setThreadContactId(contactId)
    setThreadLoading(true)
    setComposeMessage('')
    setComposeStagedId(null)
    setComposeStatus(null)

    // Fetch messages and staged draft in parallel
    const [convRes] = await Promise.all([
      fetch(`/api/crm/conversation?contactId=${contactId}`),
    ])
    const convData = await convRes.json()
    setThreadMessages(convData.messages || [])
    setThreadLoading(false)

    // Fetch staged draft for pre-fill
    fetch(`/api/crm/staged?contactId=${contactId}`)
      .then(r => r.json())
      .then((data: Array<{ id: string; message: string; status: string }>) => {
        const pending = data.find(m => m.status === 'pending')
        if (pending) setComposeMessage(pending.message)
        setComposeStagedId(pending?.id || null)
      })
      .catch(() => {})
  }

  const refreshThread = useCallback(async () => {
    if (!threadContactId) return
    const res = await fetch(`/api/crm/conversation?contactId=${threadContactId}`)
    const data = await res.json()
    setThreadMessages(data.messages || [])
  }, [threadContactId])

  const activeThreadLead = threadContactId
    ? [...ghlLeads].find(l => l.contactId === threadContactId) || null
    : null

  const handleThreadStage = async () => {
    if (!composeMessage.trim() || !threadContactId) return
    setComposeStaging(true)
    setComposeStatus(null)
    try {
      if (composeStagedId) {
        const res = await fetch(`/api/crm/staged/${composeStagedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending', message: composeMessage }),
        })
        if (res.ok) {
          setComposeStatus({ type: 'success', text: '📋 Draft updated' })
        } else {
          setComposeStatus({ type: 'error', text: 'Stage failed' })
        }
      } else {
        const res = await fetch('/api/crm/staged', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: threadContactId,
            conversation_id: activeThreadLead?.conversationId || '',
            message: composeMessage,
            contact_name: activeThreadLead?.customerName || '',
            phone: activeThreadLead?.phone || '',
            stage_name: activeThreadLead?.stageName || '',
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setComposeStagedId(data.id || null)
          setComposeMessage('')
          setComposeStatus({ type: 'success', text: '📋 Staged for review' })
        } else {
          setComposeStatus({ type: 'error', text: data.error || 'Stage failed' })
        }
      }
    } catch {
      setComposeStatus({ type: 'error', text: 'Network error' })
    } finally {
      setComposeStaging(false)
      setTimeout(() => setComposeStatus(null), 3000)
    }
  }

  const handleThreadSend = async () => {
    if (!composeMessage.trim() || !threadContactId || !activeThreadLead?.conversationId) return
    setComposeSending(true)
    setComposeStatus(null)
    try {
      const res = await fetch('/api/crm/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: threadContactId,
          conversationId: activeThreadLead.conversationId,
          message: composeMessage,
          contactName: activeThreadLead.customerName,
          phone: activeThreadLead.phone || '',
          action: 'send',
          confirmed: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setComposeMessage('')
        setComposeStagedId(null)
        setComposeStatus({ type: 'success', text: '⚡ Sent!' })
        await refreshThread()
      } else {
        setComposeStatus({ type: 'error', text: data.error || 'Send failed' })
      }
    } catch {
      setComposeStatus({ type: 'error', text: 'Network error' })
    } finally {
      setComposeSending(false)
      setTimeout(() => setComposeStatus(null), 3000)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/quote-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {})
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const handleUploaded = (id: number, filename: string, originalName: string) => {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, quote_file: filename, quote_file_name: originalName, status: 'quoted' } : r)
    )
  }

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'needs-quote', label: '⏳ Needs Quote', count: ghlLeads.length },
    { key: 'website',     label: '🌐 Website Requests', count: requests.length },
    { key: 'all',         label: 'All', count: ghlLeads.length + requests.length },
  ]

  // All-tab merged list newest first
  type AllEntry = { type: 'ghl'; lead: GhlLead; createdAt: string } | { type: 'quarriva'; req: QuoteRequest; createdAt: string }
  const allMerged: AllEntry[] = [
    ...ghlLeads.map(l => ({ type: 'ghl' as const, lead: l, createdAt: l.createdAt })),
    ...requests.map(r => ({ type: 'quarriva' as const, req: r, createdAt: r.created_at })),
  ].sort((a, b) => sortOrder === 'newest'
    ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-slate-700 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-amber-400 font-bold text-xl">◆ Quarriva</Link>
            <span className="text-slate-600">/</span>
            <Link href="/crm" className="text-slate-400 hover:text-white text-sm">CRM</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">Quote Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#d4a847]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <Link
              href="/crm"
              className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Back to CRM
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Quote Requests</h1>
          <span className="text-slate-400 text-sm">{ghlLeads.length + requests.length} total</span>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 flex-wrap mb-6 border-b border-slate-700/50 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                activeTab === tab.key ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {tab.count}
              </span>
              {tab.key === 'needs-quote' && tab.count > 0 && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* ⏳ Needs Quote tab — GHL leads */}
        {activeTab === 'needs-quote' && (
          <div className="space-y-4">
            {ghlLeads.length === 0 ? (
              <div className="text-center py-20 border border-slate-700 rounded-2xl text-slate-500">
                <div className="text-3xl mb-2">✅</div>
                <div>No leads waiting for a quote</div>
              </div>
            ) : (
              <>
                <p className="text-slate-500 text-sm mb-4">
                  GHL pipeline leads in Qualified / Sketch Received / Ready for Templating stages.
                </p>
                {[...ghlLeads].sort((a, b) => sortOrder === 'newest'
                  ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                ).map(lead => (
                  <GhlLeadCard key={lead.id} lead={lead} onViewThread={openThread} />
                ))}
              </>
            )}
          </div>
        )}

        {/* 🌐 Website Requests tab — Quarriva DB */}
        {activeTab === 'website' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-20 border border-slate-700 rounded-2xl text-slate-500">
                <div className="text-3xl mb-2">📋</div>
                <div>No website quote requests</div>
              </div>
            ) : (
              [...requests].sort((a, b) => sortOrder === 'newest'
                ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              ).map(qr => (
                <QuarrivaCard
                  key={qr.id}
                  qr={qr}
                  onStatusChange={updateStatus}
                  onUploaded={handleUploaded}
                  onViewThread={openThread}
                />
              ))
            )}
          </div>
        )}

        {/* All tab — merged */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            {allMerged.length === 0 ? (
              <div className="text-center py-20 border border-slate-700 rounded-2xl text-slate-500">
                <div className="text-3xl mb-2">📋</div>
                <div>No quote requests yet</div>
              </div>
            ) : (
              allMerged.map(entry => {
                if (entry.type === 'ghl') {
                  return (
                    <div key={`ghl-${entry.lead.id}`} className="relative">
                      <span className="absolute -top-2 left-4 text-xs bg-[#0f172a] px-1.5 text-amber-500 font-medium z-10">GHL</span>
                      <GhlLeadCard lead={entry.lead} onViewThread={openThread} />
                    </div>
                  )
                }
                return (
                  <div key={`qr-${entry.req.id}`} className="relative">
                    <span className="absolute -top-2 left-4 text-xs bg-[#0f172a] px-1.5 text-slate-400 font-medium z-10">Website</span>
                    <QuarrivaCard
                      qr={entry.req}
                      onStatusChange={updateStatus}
                      onUploaded={handleUploaded}
                      onViewThread={openThread}
                    />
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Thread Panel — slide-in from right */}
      {threadContactId && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[#1a1a2e] border-l border-slate-700 flex flex-col z-50 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div>
              <h3 className="font-semibold text-white">Conversation</h3>
              {activeThreadLead && (
                <p className="text-xs text-slate-400 mt-0.5">{activeThreadLead.customerName}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={refreshThread} className="text-slate-400 hover:text-white text-xs">🔄 Refresh</button>
              <button onClick={() => setThreadContactId(null)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadLoading ? (
              <div className="text-slate-500 text-center py-8">Loading...</div>
            ) : threadMessages.length === 0 ? (
              <div className="text-slate-500 text-center py-8">No messages yet</div>
            ) : (
              threadMessages.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-[#d4a847]/20 text-[#d4a847] border border-[#d4a847]/30'
                      : 'bg-slate-700 text-white'
                  }`}>
                    <p>{msg.body || '(attachment)'}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(msg.dateAdded).toLocaleDateString()} {new Date(msg.dateAdded).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                      {msg.channelLabel && msg.channelLabel !== 'SMS' && (
                        <span className="ml-1">{msg.channelLabel === 'FB' ? '📘' : '📧'}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Compose box at bottom of thread panel */}
          <div className="border-t border-slate-700 p-3">
            {composeStatus && (
              <p className={`text-xs mb-2 ${composeStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {composeStatus.text}
              </p>
            )}
            <div className="flex gap-2">
              <textarea
                value={composeMessage}
                onChange={e => setComposeMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none h-16 focus:outline-none focus:border-[#d4a847]"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleThreadStage}
                  disabled={composeStaging || !composeMessage.trim()}
                  className="text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {composeStaging ? '...' : '📋 Stage'}
                </button>
                <button
                  onClick={handleThreadSend}
                  disabled={composeSending || !composeMessage.trim() || !activeThreadLead?.conversationId}
                  className="text-xs bg-[#d4a847] text-black font-bold hover:bg-yellow-400 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  title={!activeThreadLead?.conversationId ? 'No conversation ID' : ''}
                >
                  {composeSending ? '...' : '⚡ Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
