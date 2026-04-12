'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Favorite {
  id: number
  stone_id: string
  stone_name: string
  stone_image: string
  stone_material: string
  stone_price_range: number
  created_at: string
}

interface QuoteRequest {
  id: number
  stone_id: string
  stone_name: string
  customer_name: string
  phone: string
  sqft_estimate: number
  notes: string
  layout: string | null
  sink_type: string | null
  status: string
  created_at: string
  quote_file: string | null
  quote_file_name: string | null
  stones: Array<{ stoneId: string; stoneName: string; stoneImage: string }> | null
  unread_count: number
  message_count: number
}

const PRICE_LABELS: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

const LAYOUT_OPTIONS = ['U-shape', 'L-shape', 'Straight', 'Island', 'Other']
const SINK_OPTIONS = [
  { value: 'none', label: 'No Sink' },
  { value: 'single', label: 'Single Basin' },
  { value: 'double', label: 'Double Basin' },
]

function MultiQuoteModal({
  stones,
  onClose,
  onSubmit,
}: {
  stones: Favorite[]
  onClose: () => void
  onSubmit: () => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [sqft, setSqft] = useState('')
  const [layout, setLayout] = useState('')
  const [sinkType, setSinkType] = useState('none')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const stonesPayload = stones.map(s => ({
      stoneId: s.stone_id,
      stoneName: s.stone_name,
      stoneImage: s.stone_image,
    }))

    const res = await fetch('/api/quote-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stones: stonesPayload,
        customer_name: customerName,
        phone,
        sqft_estimate: parseFloat(sqft) || null,
        layout: layout || null,
        sink_type: sinkType || null,
        notes,
      }),
    })

    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to submit request')
      return
    }
    onSubmit()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg my-8">
        <h2 className="text-lg font-bold text-white mb-1">Request a Quote</h2>
        <p className="text-slate-400 text-sm mb-4">
          {stones.length} stone{stones.length !== 1 ? 's' : ''} selected
        </p>

        {/* Stone thumbnails */}
        <div className="flex gap-2 flex-wrap mb-5">
          {stones.map(s => (
            <div key={s.stone_id} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5">
              {s.stone_image ? (
                <img
                  src={s.stone_image}
                  alt={s.stone_name}
                  className="w-8 h-8 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-500">◆</div>
              )}
              <span className="text-white text-xs font-medium">{s.stone_name}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Estimated Sq Ft</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={sqft}
                onChange={e => setSqft(e.target.value)}
                placeholder="e.g. 45"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Layout</label>
              <select
                value={layout}
                onChange={e => setLayout(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">Select layout</option>
                {LAYOUT_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Sink Cutouts</label>
            <div className="flex gap-2">
              {SINK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSinkType(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    sinkType === opt.value
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'border-slate-600 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Edge profile, special requests…"
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-600 text-slate-300 hover:text-white py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Quote Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Legacy single-stone modal (kept for single "Request Quote" button on card)
function QuoteRequestModal({
  stone,
  onClose,
  onSubmit,
}: {
  stone: Favorite
  onClose: () => void
  onSubmit: () => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [sqft, setSqft] = useState('')
  const [layout, setLayout] = useState('')
  const [sinkType, setSinkType] = useState('none')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/quote-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stone_id: stone.stone_id,
        stone_name: stone.stone_name,
        customer_name: customerName,
        phone,
        sqft_estimate: parseFloat(sqft) || null,
        layout: layout || null,
        sink_type: sinkType || null,
        notes,
      }),
    })

    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to submit request')
      return
    }
    onSubmit()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold text-white mb-1">Request a Quote</h2>
        <p className="text-slate-400 text-sm mb-5">
          {stone.stone_name} — {stone.stone_material}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Estimated Sq Ft</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={sqft}
                onChange={e => setSqft(e.target.value)}
                placeholder="e.g. 45"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Layout</label>
              <select
                value={layout}
                onChange={e => setLayout(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">Select layout</option>
                {LAYOUT_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Sink Cutouts</label>
            <div className="flex gap-2">
              {SINK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSinkType(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    sinkType === opt.value
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'border-slate-600 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Edge profile, cutouts, special requests…"
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-600 text-slate-300 hover:text-white py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'favorites' | 'quotes'>('favorites')
  const [requestModalStone, setRequestModalStone] = useState<Favorite | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [multiQuoteOpen, setMultiQuoteOpen] = useState(false)
  const [activeThread, setActiveThread] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      Promise.all([
        fetch('/api/favorites').then(r => r.json()).catch(() => []),
        fetch('/api/quote-requests').then(r => r.json()).catch(() => []),
      ]).then(([favs, quotes]) => {
        setFavorites(Array.isArray(favs) ? favs : [])
        setQuoteRequests(Array.isArray(quotes) ? quotes : [])
        setLoading(false)
      })
    }
  }, [status])

  const removeFavorite = async (stoneId: string) => {
    await fetch('/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stone_id: stoneId }),
    })
    setFavorites(prev => prev.filter(f => f.stone_id !== stoneId))
    setSelectedIds(prev => { const s = new Set(prev); s.delete(stoneId); return s })
  }

  const toggleSelect = (stoneId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(stoneId)) next.delete(stoneId)
      else next.add(stoneId)
      return next
    })
  }

  const refreshQuotes = () => {
    setRequestModalStone(null)
    setMultiQuoteOpen(false)
    setSelectedIds(new Set())
    fetch('/api/quote-requests').then(r => r.json()).then(data => {
      setQuoteRequests(Array.isArray(data) ? data : [])
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    )
  }

  if (!session) return null

  const statusColor: Record<string, string> = {
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    quoted: 'text-green-400 bg-green-400/10 border-green-400/30',
    closed: 'text-slate-400 bg-slate-700 border-slate-600',
  }

  const selectedStones = favorites.filter(f => selectedIds.has(f.stone_id))

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-amber-400 font-bold text-xl">Quarriva</Link>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage your saved stones and quote requests.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700 rounded-xl p-1 w-fit mb-8">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ❤️ Saved Stones ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'quotes'
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📋 Quote Requests ({quoteRequests.length})
          </button>
        </div>

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div>
            {favorites.length === 0 ? (
              <div className="text-center py-20 border border-slate-700 rounded-2xl">
                <p className="text-slate-400 text-lg mb-2">No saved stones yet</p>
                <p className="text-slate-500 text-sm mb-6">Browse the catalog and click ❤️ to save stones you like.</p>
                <Link
                  href="/stones"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Browse Stones
                </Link>
              </div>
            ) : (
              <>
                {/* Selection hint */}
                {favorites.length > 1 && (
                  <p className="text-slate-500 text-xs mb-4">
                    ☑ Tap the checkbox on any stone to select multiple — then request a quote for all at once.
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {favorites.map(fav => {
                    const isSelected = selectedIds.has(fav.stone_id)
                    return (
                      <div
                        key={fav.id}
                        className={`bg-slate-800 rounded-xl overflow-hidden border transition-colors group ${
                          isSelected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        <div className="aspect-square relative bg-slate-700">
                          <Link href={`/stones/${fav.stone_id}`} className="block w-full h-full">
                          {fav.stone_image ? (
                            <img
                              src={fav.stone_image}
                              alt={fav.stone_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-4xl">◆</div>
                          )}
                          </Link>
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSelect(fav.stone_id)}
                            className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-500 border-amber-500 text-slate-900'
                                : 'bg-slate-900/70 border-slate-500 text-transparent hover:border-amber-400'
                            }`}
                            title={isSelected ? 'Deselect' : 'Select for quote'}
                          >
                            ✓
                          </button>
                          {/* Remove favorite */}
                          <button
                            onClick={() => removeFavorite(fav.stone_id)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-red-500/80 flex items-center justify-center text-red-400 hover:text-white transition-colors text-sm"
                            title="Remove from favorites"
                          >
                            ❤️
                          </button>
                        </div>
                        <div className="p-3">
                          <Link href={`/stones/${fav.stone_id}`} className="block font-semibold text-sm leading-tight mb-1 hover:text-amber-400 transition-colors">{fav.stone_name}</Link>
                          <p className="text-slate-400 text-xs capitalize mb-2">{fav.stone_material}</p>
                          <div className="flex gap-1">
                          <button
                            onClick={() => setRequestModalStone(fav)}
                            className="flex-1 text-center bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-900 text-xs font-bold py-1.5 rounded transition-colors"
                          >
                            Quote
                          </button>
                          <Link href={`/stones/${fav.stone_id}`} className="flex-1 text-center bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold py-1.5 rounded transition-colors text-center">
                            View
                          </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Quotes Tab */}
        {activeTab === 'quotes' && (
          <div>
            {quoteRequests.length === 0 ? (
              <div className="text-center py-20 border border-slate-700 rounded-2xl">
                <p className="text-slate-400 text-lg mb-2">No quote requests yet</p>
                <p className="text-slate-500 text-sm mb-6">Save a stone and click &ldquo;Request Quote&rdquo; to get started.</p>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  View Saved Stones
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {quoteRequests.map(qr => {
                  const displayStones = qr.stones && qr.stones.length > 0
                    ? qr.stones
                    : [{ stoneId: qr.stone_id, stoneName: qr.stone_name || qr.stone_id, stoneImage: '' }]
                  return (
                    <div
                      key={qr.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          {displayStones.length > 1 ? (
                            <div className="flex gap-1 items-center">
                              {displayStones.slice(0, 3).map(s => (
                                <div key={s.stoneId} title={s.stoneName} className="w-8 h-8 rounded overflow-hidden bg-slate-700 border border-slate-600">
                                  {s.stoneImage ? (
                                    <img src={s.stoneImage} alt={s.stoneName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">◆</div>
                                  )}
                                </div>
                              ))}
                              {displayStones.length > 3 && (
                                <span className="text-slate-500 text-xs">+{displayStones.length - 3}</span>
                              )}
                            </div>
                          ) : null}
                          <p className="font-semibold text-white">
                            {displayStones.length > 1
                              ? `${displayStones.length} Stones`
                              : displayStones[0]?.stoneName}
                          </p>
                          <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${statusColor[qr.status] || statusColor.pending}`}>
                            {qr.status === 'quoted' ? '✓ Quote Ready' : qr.status}
                          </span>
                        </div>
                        {displayStones.length > 1 && (
                          <p className="text-slate-500 text-xs mb-1">
                            {displayStones.map(s => s.stoneName).join(' · ')}
                          </p>
                        )}
                        <div className="text-slate-400 text-sm flex flex-wrap gap-x-4 gap-y-1">
                          {qr.sqft_estimate && <span>~{qr.sqft_estimate} sqft</span>}
                          {qr.layout && <span>{qr.layout}</span>}
                          {qr.sink_type && qr.sink_type !== 'none' && <span>{qr.sink_type} sink</span>}
                          {qr.phone && <span>{qr.phone}</span>}
                          <span>{new Date(qr.created_at).toLocaleDateString()}</span>
                        </div>
                        {qr.notes && (
                          <p className="text-slate-500 text-sm mt-2 italic">&ldquo;{qr.notes}&rdquo;</p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col gap-2 items-end">
                        {qr.quote_file ? (
                          <a
                            href={`/api/quotes/download/${qr.quote_file}`}
                            download={qr.quote_file_name || 'quote.pdf'}
                            className="inline-flex items-center gap-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                          >
                            ⬇ Download Quote
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs">Awaiting quote…</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky "Quote Selected" bar */}
      {selectedIds.size > 0 && activeTab === 'favorites' && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-slate-900 px-4 py-4 flex items-center justify-between gap-4 z-40 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {selectedStones.slice(0, 4).map(s => (
                <div key={s.stone_id} className="w-8 h-8 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-700">
                  {s.stone_image ? (
                    <img src={s.stone_image} alt={s.stone_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">◆</div>
                  )}
                </div>
              ))}
            </div>
            <span className="font-bold text-sm">
              {selectedIds.size} stone{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-800 hover:text-slate-900 text-sm px-3 py-2 rounded-lg"
            >
              Clear
            </button>
            <button
              onClick={() => setMultiQuoteOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Quote Selected ({selectedIds.size}) →
            </button>
          </div>
        </div>
      )}

      {/* Single stone quote modal */}
      {requestModalStone && (
        <QuoteRequestModal
          stone={requestModalStone}
          onClose={() => setRequestModalStone(null)}
          onSubmit={refreshQuotes}
        />
      )}

      {/* Multi-stone quote modal */}
      {multiQuoteOpen && selectedStones.length > 0 && (
        <MultiQuoteModal
          stones={selectedStones}
          onClose={() => setMultiQuoteOpen(false)}
          onSubmit={refreshQuotes}
        />
      )}

    </div>
  )
}

function UserMessageThread({ quoteId, onClose }: { quoteId: number; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; body: string; created_at: string; read_at: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/quote-requests/${quoteId}/messages`)
      .then(r => r.json())
      .then(d => { setMessages(d.messages || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [quoteId])

  useEffect(() => { load() }, [load])

  const send = async () => {
    if (!reply.trim()) return
    setSending(true)
    await fetch(`/api/quote-requests/${quoteId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply.trim() }),
    })
    setReply('')
    setSending(false)
    load()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <div className="text-white font-bold">Messages</div>
            <div className="text-slate-400 text-xs">Quote #{quoteId} · Arts Marble & Granite</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">No messages yet. Ask us anything about your quote.</div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  m.sender === 'user'
                    ? 'bg-amber-500 text-slate-900 rounded-br-sm'
                    : 'bg-slate-800 text-white border border-slate-700 rounded-bl-sm'
                }`}>
                  <p className={m.sender === 'admin' ? 'text-xs text-amber-400 font-medium mb-1' : 'hidden'}>Arts Marble & Granite</p>
                  <p>{m.body}</p>
                  <p className={`text-xs mt-1 ${m.sender === 'user' ? 'text-amber-900' : 'text-slate-500'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-slate-700 p-4 flex gap-2">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask a question about your quote…"
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 text-white text-sm resize-none outline-none"
          />
          <button
            onClick={send}
            disabled={!reply.trim() || sending}
            className="px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold rounded-xl text-sm"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
