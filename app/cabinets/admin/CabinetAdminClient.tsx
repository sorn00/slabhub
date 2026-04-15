'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface CabinetSelection {
  sku: string
  name: string
  qty: number
  dimensions: string
}

interface QuoteRequest {
  id: number
  name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  project_type: string | null
  cabinet_styles: string | null
  preferred_tier: string | null
  timeline: string | null
  notes: string | null
  cabinet_selections: CabinetSelection[] | null
  status: string
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  new:       'bg-amber-900/60 text-amber-300 border-amber-700',
  contacted: 'bg-green-900/60 text-green-300 border-green-700',
  closed:    'bg-slate-700 text-slate-300 border-slate-500',
}

const STATUS_OPTIONS = ['new', 'contacted', 'closed'] as const

export default function CabinetAdminClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<QuoteRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)
  const [error, setError]       = useState('')

  // Auth gate
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cabinets/quote')
      if (res.ok) {
        const data: QuoteRequest[] = await res.json()
        setRequests(data)
      }
    } catch {
      setError('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, load])

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdating(id)
    try {
      const res = await fetch('/api/cabinets/quote', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
      }
    } finally {
      setUpdating(null)
    }
  }

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    )
  }

  if (status !== 'authenticated') return null

  const userRole = (session?.user as { role?: string } | undefined)?.role
  const isAuthorized = userRole === 'admin' || userRole === 'reviewer'

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-2">Access Denied</div>
          <div className="text-slate-500 text-sm">Admin or reviewer role required.</div>
        </div>
      </div>
    )
  }

  const counts = { new: 0, contacted: 0, closed: 0 }
  for (const r of requests) {
    if (r.status in counts) counts[r.status as keyof typeof counts]++
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-extrabold text-white mb-1">Cabinet Quote Requests</h1>
          <p className="text-slate-400 text-sm">All inbound cabinet inquiries from the configurator and quote form.</p>
          <div className="flex gap-4 mt-4">
            {Object.entries(counts).map(([status, count]) => (
              <div key={status} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-center">
                <div className="text-2xl font-bold text-white">{count}</div>
                <div className={`text-xs uppercase tracking-wider font-semibold mt-0.5 ${
                  status === 'new' ? 'text-amber-400' : status === 'contacted' ? 'text-green-400' : 'text-slate-400'
                }`}>{status}</div>
              </div>
            ))}
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{requests.length}</div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mt-0.5">Total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No quote requests yet.</div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className={`border rounded-2xl overflow-hidden transition-colors ${
                req.status === 'new' ? 'border-amber-500/30' : 'border-slate-700'
              }`}>
                {/* Summary row */}
                <div className="flex items-center gap-4 px-5 py-4 bg-slate-800/30 flex-wrap">
                  {/* Date */}
                  <div className="text-slate-500 text-xs shrink-0 w-20">
                    {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <br />
                    {new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Contact */}
                  <div className="flex-1 min-w-40">
                    <div className="text-white font-semibold">{req.name}</div>
                    <div className="text-slate-400 text-xs">{req.email}</div>
                    {req.phone && <div className="text-slate-500 text-xs">{req.phone}</div>}
                  </div>

                  {/* Location */}
                  <div className="text-slate-400 text-sm shrink-0 hidden sm:block">
                    {[req.city, req.state].filter(Boolean).join(', ') || '—'}
                  </div>

                  {/* Project type */}
                  <div className="text-slate-400 text-sm shrink-0 hidden md:block w-28">
                    {req.project_type ?? '—'}
                  </div>

                  {/* Tier */}
                  <div className="shrink-0 hidden lg:block text-xs text-slate-500 w-24">
                    {req.preferred_tier ?? '—'}
                  </div>

                  {/* Timeline */}
                  <div className="text-slate-400 text-xs shrink-0 hidden md:block w-20">
                    {req.timeline ?? '—'}
                  </div>

                  {/* Status badge + select */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[req.status] ?? STATUS_STYLES.new}`}>
                      {req.status}
                    </span>
                    <select
                      value={req.status}
                      disabled={updating === req.id}
                      onChange={e => updateStatus(req.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                    className="text-slate-500 hover:text-amber-400 transition-colors text-xs shrink-0"
                  >
                    {expanded === req.id ? '▲ Hide' : '▼ Details'}
                  </button>
                </div>

                {/* Expanded detail */}
                {expanded === req.id && (
                  <div className="border-t border-slate-700 px-5 py-5 grid sm:grid-cols-2 gap-6 bg-slate-900/30">
                    {/* Left: styles + notes */}
                    <div>
                      {req.cabinet_styles && (
                        <div className="mb-3">
                          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Selected Styles</div>
                          <div className="text-slate-300 text-sm">{req.cabinet_styles}</div>
                        </div>
                      )}
                      {req.preferred_tier && (
                        <div className="mb-3">
                          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Preferred Tier(s)</div>
                          <div className="text-slate-300 text-sm">{req.preferred_tier}</div>
                        </div>
                      )}
                      {req.notes && (
                        <div>
                          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Notes</div>
                          <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{req.notes}</div>
                        </div>
                      )}
                    </div>

                    {/* Right: cabinet selections */}
                    <div>
                      {req.cabinet_selections && req.cabinet_selections.length > 0 ? (
                        <div>
                          <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                            Cabinet List ({req.cabinet_selections.reduce((s, i) => s + i.qty, 0)} pieces)
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {req.cabinet_selections.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="text-slate-300">{item.name}</span>
                                  <span className="text-slate-600 text-xs ml-2 font-mono">{item.sku}</span>
                                  {item.dimensions && (
                                    <span className="text-slate-600 text-xs ml-2">{item.dimensions}</span>
                                  )}
                                </div>
                                <span className="text-amber-400 font-bold ml-3">×{item.qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-600 text-sm italic">No itemized cabinet list — general inquiry.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
