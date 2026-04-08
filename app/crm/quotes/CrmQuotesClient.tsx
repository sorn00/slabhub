'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

interface StoneItem {
  stoneId: string
  stoneName: string
  stoneImage: string
}

interface QuoteRequest {
  id: number
  user_id: number
  stone_id: string
  stone_name: string
  customer_name: string
  phone: string
  sqft_estimate: number | null
  notes: string | null
  layout: string | null
  sink_type: string | null
  status: string
  created_at: string
  user_name: string
  user_email: string
  quote_file: string | null
  quote_file_name: string | null
  quote_file_uploaded_at: string | null
  stones: StoneItem[] | null
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  quoted: 'text-green-400 bg-green-400/10 border-green-400/30',
  complete: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  closed: 'text-slate-400 bg-slate-700 border-slate-600',
}

function UploadButton({ requestId, onUploaded }: { requestId: number; onUploaded: (filename: string, originalName: string) => void }) {
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

    const res = await fetch(`/api/quote-requests/${requestId}/upload`, {
      method: 'POST',
      body: form,
    })

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

export default function CrmQuotesClient({ initialRequests }: { initialRequests: QuoteRequest[] }) {
  const [requests, setRequests] = useState<QuoteRequest[]>(initialRequests)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/quote-requests`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {})
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const handleUploaded = (id: number, filename: string, originalName: string) => {
    setRequests(prev => prev.map(r =>
      r.id === id ? { ...r, quote_file: filename, quote_file_name: originalName, status: 'quoted' } : r
    ))
  }

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter)

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    quoted: requests.filter(r => r.status === 'quoted').length,
    complete: requests.filter(r => r.status === 'complete').length,
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-slate-700 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-amber-400 font-bold text-xl">◆ SlabHub</Link>
            <span className="text-slate-600">/</span>
            <Link href="/crm" className="text-slate-400 hover:text-white text-sm">CRM</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">Quote Requests</span>
          </div>
          <Link
            href="/crm"
            className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Back to CRM
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Quote Requests</h1>
          <span className="text-slate-400 text-sm">{requests.length} total</span>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap mb-6">
          {(['all', 'pending', 'quoted', 'complete'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                statusFilter === tab
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab} ({counts[tab as keyof typeof counts] ?? requests.filter(r => r.status === tab).length})
              {tab === 'pending' && counts.pending > 0 && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Requests list */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20 border border-slate-700 rounded-2xl text-slate-500">
              <div className="text-3xl mb-2">📋</div>
              <div>No quote requests in this view</div>
            </div>
          ) : (
            filtered.map(qr => {
              const displayStones: StoneItem[] = qr.stones && qr.stones.length > 0
                ? qr.stones
                : [{ stoneId: qr.stone_id, stoneName: qr.stone_name || qr.stone_id, stoneImage: '' }]

              return (
                <div key={qr.id} className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-bold text-white text-lg">
                          {qr.customer_name}
                        </span>
                        <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${STATUS_BADGE[qr.status] || STATUS_BADGE.pending}`}>
                          {qr.status}
                        </span>
                        <span className="text-slate-500 text-xs">#{qr.id}</span>
                      </div>
                      <div className="flex gap-4 flex-wrap text-sm text-slate-400">
                        <span>{qr.phone}</span>
                        <span>{qr.user_email}</span>
                        <span>{new Date(qr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Status changer */}
                    <select
                      value={qr.status}
                      onChange={e => updateStatus(qr.id, e.target.value)}
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
                      onUploaded={(filename, originalName) => handleUploaded(qr.id, filename, originalName)}
                    />
                    <a
                      href={`tel:${qr.phone}`}
                      className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
                    >
                      📞 Call
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
