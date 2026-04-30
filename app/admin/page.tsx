'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Stone {
  id: string
  name: string
  material: string
  primaryColor: string
  priceRange: number
  imageUrl?: string
}

interface Special {
  id: string
  title: string
  description: string
  discountText: string
  stoneId: string
  expiryDate: string
  createdAt: string
}

interface LeadPrice {
  state: string
  name: string
  price: number
}

interface Fabricator {
  id?: string
  businessName?: string
  name?: string
  state?: string
  coverage?: string
  createdAt?: string
}

interface Quote {
  id?: string
  name?: string
  zip?: string
  material?: string
  selectedStones?: string[]
  createdAt?: string
  email?: string
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

function Badge({ children, color = 'amber' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/15 text-green-400 border-green-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    slate: 'bg-slate-700 text-slate-300 border-slate-600',
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${colors[color] || colors.slate}`}>
      {children}
    </span>
  )
}

function SaveButton({
  onClick,
  saving,
  saved,
}: {
  onClick: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold px-5 py-2 rounded-lg transition-colors text-sm"
    >
      {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
    </button>
  )
}

// ─── Section 1: Featured Stones ─────────────────────────────────────────────

function FeaturedStones() {
  const [stones, setStones] = useState<Stone[]>([])
  const [featured, setFeatured] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/data/msi-catalog.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/admin/featured').then(r => r.json()).catch(() => []),
    ]).then(([catalog, featuredIds]) => {
      setStones(catalog)
      setFeatured(new Set(featuredIds))
      setLoading(false)
    })
  }, [])

  const toggle = (id: string) => {
    setFeatured(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/featured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Array.from(featured)),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const filtered = stones.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.material.toLowerCase().includes(search.toLowerCase())
  )

  const featuredStones = stones.filter(s => featured.has(s.id))
  const materialColors: Record<string, string> = {
    quartz: 'blue',
    granite: 'green',
    marble: 'amber',
    quartzite: 'red',
  }

  return (
    <div>
      <SectionHeader
        title="Featured Stones"
        subtitle="Select up to 12 stones to feature on the homepage with a 'Featured' badge."
      />

      {/* Current featured count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {featuredStones.length === 0 ? (
            <span className="text-slate-500 text-sm">No stones featured yet</span>
          ) : (
            featuredStones.slice(0, 6).map(s => (
              <span key={s.id} className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-amber-400 text-xs">
                {s.name}
                <button onClick={() => toggle(s.id)} className="ml-1 hover:text-white">×</button>
              </span>
            ))
          )}
          {featuredStones.length > 6 && (
            <span className="text-slate-400 text-xs self-center">+{featuredStones.length - 6} more</span>
          )}
        </div>
        <SaveButton onClick={save} saving={saving} saved={saved} />
      </div>

      <input
        type="text"
        placeholder="Search stones by name or material…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-4 text-sm"
      />

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading catalog…</div>
      ) : stones.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center">
          No catalog found. Run the scraper first: <code className="text-amber-400">node scripts/scrape-msi.js</code>
        </div>
      ) : (
        <div className="border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left text-slate-400 font-medium px-4 py-3 w-10">✓</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Stone</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 hidden md:table-cell">Material</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 hidden lg:table-cell">Color</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((stone, i) => (
                <tr
                  key={stone.id}
                  onClick={() => toggle(stone.id)}
                  className={`border-b border-slate-700/50 cursor-pointer transition-colors hover:bg-slate-700/30 ${featured.has(stone.id) ? 'bg-amber-500/5' : ''} ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}
                >
                  <td className="px-4 py-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${featured.has(stone.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-600'}`}>
                      {featured.has(stone.id) && <span className="text-slate-900 text-xs font-bold">✓</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{stone.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge color={materialColors[stone.material] || 'slate'}>{stone.material}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell capitalize">{stone.primaryColor}</td>
                  <td className="px-4 py-3 text-amber-400">{'$'.repeat(stone.priceRange)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <div className="px-4 py-3 text-slate-500 text-xs bg-slate-800/30">
              Showing 100 of {filtered.length} results. Refine your search to see more.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section 2: Stone Specials ───────────────────────────────────────────────

function StoneSpecials() {
  const [specials, setSpecials] = useState<Special[]>([])
  const [saving, setSaving] = useState(false)
  const [stones, setStones] = useState<Stone[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    discountText: '',
    stoneId: '',
    expiryDate: '',
  })

  const loadSpecials = useCallback(() => {
    fetch('/api/admin/specials').then(r => r.json()).then(setSpecials).catch(() => {})
  }, [])

  useEffect(() => {
    loadSpecials()
    fetch('/data/msi-catalog.json').then(r => r.ok ? r.json() : []).then(setStones).catch(() => {})
  }, [loadSpecials])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.expiryDate) return
    setSaving(true)
    await fetch('/api/admin/specials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setForm({ title: '', description: '', discountText: '', stoneId: '', expiryDate: '' })
    loadSpecials()
  }

  const deleteSpecial = async (index: number) => {
    if (!confirm('Delete this special?')) return
    await fetch('/api/admin/specials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _delete: index }),
    })
    loadSpecials()
  }

  const isActive = (s: Special) => new Date(s.expiryDate) > new Date()

  return (
    <div>
      <SectionHeader
        title="Stone Specials"
        subtitle="Add promotional banners that appear on the homepage. Expired specials are hidden automatically."
      />

      {/* Add Special Form */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6">
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">New Special</h3>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Banner Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Stone Sale"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Discount Text</label>
            <input
              type="text"
              placeholder="e.g. 15% off install through June"
              value={form.discountText}
              onChange={e => setForm(f => ({ ...f, discountText: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-slate-400 text-xs mb-1">Description</label>
            <input
              type="text"
              placeholder="Short promotional copy shown in the banner"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Linked Stone (optional)</label>
            <select
              value={form.stoneId}
              onChange={e => setForm(f => ({ ...f, stoneId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
            >
              <option value="">— No specific stone —</option>
              {stones.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.material})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Expiry Date *</label>
            <input
              type="date"
              required
              value={form.expiryDate}
              onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Adding…' : '+ Add Special'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Specials */}
      {specials.length === 0 ? (
        <div className="text-slate-500 text-sm py-6 text-center border border-slate-700 rounded-xl">
          No specials yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {specials.map((s, i) => (
            <div
              key={s.id}
              className={`border rounded-xl p-4 flex items-start justify-between gap-4 ${isActive(s) ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-700 opacity-60'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold">{s.title}</span>
                  <Badge color={isActive(s) ? 'green' : 'slate'}>{isActive(s) ? 'Active' : 'Expired'}</Badge>
                  {s.discountText && <Badge color="amber">{s.discountText}</Badge>}
                </div>
                {s.description && <p className="text-slate-400 text-sm">{s.description}</p>}
                <p className="text-slate-500 text-xs mt-1">
                  Expires: {new Date(s.expiryDate).toLocaleDateString()}
                  {s.stoneId && ` · Stone: ${s.stoneId}`}
                </p>
              </div>
              <button
                onClick={() => deleteSpecial(i)}
                className="text-slate-600 hover:text-red-400 transition-colors text-sm shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section 3: Lead Pricing ─────────────────────────────────────────────────

function LeadPricing() {
  const [pricing, setPricing] = useState<LeadPrice[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/lead-pricing').then(r => r.json()).then(data => {
      setPricing(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const update = (state: string, price: number) => {
    setPricing(prev => prev.map(p => p.state === state ? { ...p, price } : p))
    setSaved(false)
  }

  const setAll = (price: number) => {
    setPricing(prev => prev.map(p => ({ ...p, price })))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/lead-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pricing),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>

  return (
    <div>
      <SectionHeader
        title="Lead Pricing"
        subtitle="Set the price fabricators pay per lead, by state. Default is $200."
      />

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">Set all to:</span>
          {[150, 200, 250, 300].map(p => (
            <button
              key={p}
              onClick={() => setAll(p)}
              className="text-slate-400 hover:text-amber-400 text-sm border border-slate-700 hover:border-amber-500/40 rounded px-2 py-1 transition-colors"
            >
              ${p}
            </button>
          ))}
        </div>
        <SaveButton onClick={save} saving={saving} saved={saved} />
      </div>

      <div className="border border-slate-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-slate-700/50">
          {pricing.map(p => (
            <div key={p.state} className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-slate-400 text-xs w-6 font-mono">{p.state}</span>
              <span className="text-slate-300 text-sm flex-1 truncate">{p.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-xs">$</span>
                <input
                  type="number"
                  min={50}
                  max={1000}
                  step={25}
                  value={p.price}
                  onChange={e => update(p.state, Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 text-sm text-right focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Section 4: Fabricators ──────────────────────────────────────────────────

function Fabricators() {
  const [fabricators, setFabricators] = useState<Fabricator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/fabricators').then(r => r.json()).then(data => {
      setFabricators(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <SectionHeader
        title="Registered Fabricators"
        subtitle="All fabricators who have registered on Quarriva. Read-only."
      />

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : fabricators.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-slate-700 rounded-xl">
          No fabricators registered yet.
        </div>
      ) : (
        <div className="border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Business</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 hidden md:table-cell">State</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 hidden lg:table-cell">Coverage</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Registered</th>
              </tr>
            </thead>
            <tbody>
              {fabricators.map((f, i) => (
                <tr key={f.id || i} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                  <td className="px-4 py-3 text-white">{f.businessName || f.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{f.state || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{f.coverage || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Section 5: Quote Requests ───────────────────────────────────────────────

function QuoteRequests() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/quotes').then(r => r.json()).then(data => {
      // Sort newest first
      setQuotes([...data].reverse())
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <SectionHeader
        title="Quote Requests"
        subtitle="All homeowner quote requests. Read-only."
      />

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : quotes.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-slate-700 rounded-xl">
          No quote requests yet.
        </div>
      ) : (
        <div className="border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Customer</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 hidden md:table-cell">ZIP</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 hidden md:table-cell">Material</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3 hidden lg:table-cell">Stones</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => (
                <tr key={q.id || i} className={`border-b border-slate-700/50 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                  <td className="px-4 py-3">
                    <div className="text-white">{q.name || '—'}</div>
                    {q.email && <div className="text-slate-500 text-xs">{q.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{q.zip || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {q.material ? <Badge color="blue">{q.material}</Badge> : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {q.selectedStones && q.selectedStones.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {q.selectedStones.map(id => (
                          <span key={id} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{id}</span>
                        ))}
                      </div>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Section 6: Customer Quote Requests ─────────────────────────────────────

interface CustomerQuoteRequest {
  id: number
  stone_id: string
  stone_name: string
  customer_name: string
  phone: string
  sqft_estimate: number
  notes: string
  status: string
  created_at: string
  user_name: string
  user_email: string
  quote_file: string | null
  quote_file_name: string | null
  unread_count: number
  message_count: number
}

interface QuoteMessage {
  id: number
  sender: 'admin' | 'user'
  body: string
  created_at: string
  read_at: string | null
}

function MessageThread({ quoteId, customerName, onClose }: { quoteId: number; customerName: string; onClose: () => void }) {
  const [messages, setMessages] = useState<QuoteMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useState<HTMLDivElement | null>(null)

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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <div className="text-white font-bold">Thread with {customerName}</div>
            <div className="text-slate-400 text-xs">Quote #{quoteId}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">No messages yet. Send the first one.</div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  m.sender === 'admin'
                    ? 'bg-amber-500 text-slate-900 rounded-br-sm'
                    : 'bg-slate-800 text-white border border-slate-700 rounded-bl-sm'
                }`}>
                  <p>{m.body}</p>
                  <p className={`text-xs mt-1 ${m.sender === 'admin' ? 'text-amber-900' : 'text-slate-500'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {m.sender === 'admin' && m.read_at && ' · Seen'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-700 p-4 flex gap-2">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a reply…"
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

function CustomerQuoteRequests() {
  const [requests, setRequests] = useState<CustomerQuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [activeThread, setActiveThread] = useState<{ id: number; name: string } | null>(null)

  const load = useCallback(() => {
    fetch('/api/quote-requests')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setRequests(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpload = async (requestId: number, file: File) => {
    setUploading(requestId)
    setUploadError('')
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`/api/quote-requests/${requestId}/upload`, {
      method: 'POST',
      body: formData,
    })

    setUploading(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setUploadError(data.error || 'Upload failed')
    } else {
      load()
    }
  }

  const statusColor: Record<string, string> = {
    pending: 'amber',
    quoted: 'green',
    closed: 'slate',
  }

  return (
    <div>
      <SectionHeader
        title="Customer Quote Requests"
        subtitle="Quote requests submitted by registered customers. Upload a PDF to deliver their quote."
      />

      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {uploadError}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-slate-700 rounded-xl">
          No customer quote requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="border border-slate-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-semibold">{req.stone_name || req.stone_id}</span>
                    <Badge color={statusColor[req.status] || 'slate'}>
                      {req.status === 'quoted' ? '✓ Quoted' : req.status}
                    </Badge>
                  </div>
                  <div className="text-slate-400 text-sm flex flex-wrap gap-x-4 gap-y-1 mb-1">
                    <span className="font-medium text-slate-300">{req.customer_name}</span>
                    <span>{req.phone}</span>
                    {req.sqft_estimate && <span>{req.sqft_estimate} sqft</span>}
                    <span className="text-slate-500">{req.user_email}</span>
                  </div>
                  {req.notes && (
                    <p className="text-slate-500 text-xs italic">Notes: {req.notes}</p>
                  )}
                  <p className="text-slate-600 text-xs mt-1">
                    {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <button
                    onClick={() => setActiveThread({ id: req.id, name: req.customer_name })}
                    className="relative inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                  >
                    💬 Message
                    {(req.unread_count || 0) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {req.unread_count}
                      </span>
                    )}
                    {(req.message_count || 0) > 0 && (req.unread_count || 0) === 0 && (
                      <span className="text-slate-500 text-xs">({req.message_count})</span>
                    )}
                  </button>

                  {req.quote_file ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-green-400 text-xs">PDF uploaded ✓</span>
                      <label className="cursor-pointer text-xs text-slate-400 hover:text-amber-400 transition-colors underline">
                        Replace PDF
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleUpload(req.id, e.target.files[0])}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className={`cursor-pointer inline-flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                      uploading === req.id ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                      {uploading === req.id ? 'Uploading…' : '⬆ Upload PDF Quote'}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleUpload(req.id, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeThread && (
        <MessageThread
          quoteId={activeThread.id}
          customerName={activeThread.name}
          onClose={() => { setActiveThread(null); load() }}
        />
      )}
    </div>
  )
}

// ─── GHL Leads ──────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  'Ready For Templating': 'green',
  'Sketch/Measurements Received': 'amber',
  'Quote Sent': 'blue',
  'Engaging': 'amber',
  'Waiting for Response': 'slate',
  'Qualified': 'blue',
  'Live Transfer Ready': 'green',
  'Choosing Material': 'blue',
  'Unresponsive/Nurture': 'red',
}

interface GHLContact {
  id: string
  contactId: string
  name: string
  stage: string
  hoursStuck: number
  ghlLink: string
  sms: { to: string; message: string }
  email: { to: string; subject: string; message: string }
}

function GHLLeads() {
  const [contacts, setContacts] = useState<GHLContact[]>([])
  const [batchId, setBatchId] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { sms: string; email: string }>>({})
  const [channel, setChannel] = useState<Record<string, 'sms' | 'email'>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/ghl-leads')
      .then(r => r.json())
      .then(d => {
        setContacts(d.contacts || [])
        setBatchId(d.batchId || '')
        setCreatedAt(d.createdAt || '')
        // Init edits from draft
        const init: Record<string, { sms: string; email: string }> = {}
        const initCh: Record<string, 'sms' | 'email'> = {}
        for (const c of (d.contacts || [])) {
          init[c.id] = { sms: c.sms?.message || '', email: c.email?.message || '' }
          initCh[c.id] = 'sms'
        }
        setEdits(init)
        setChannel(initCh)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const send = async (c: GHLContact) => {
    const ch = channel[c.id] || 'sms'
    const msg = edits[c.id]?.[ch]
    if (!msg?.trim()) return
    setSending(c.id)
    setErrors(prev => ({ ...prev, [c.id]: '' }))
    const body: Record<string, string> = {
      phone: c.sms.to,
      name: c.name,
      message: msg,
      type: ch === 'sms' ? 'SMS' : 'Email',
    }
    if (ch === 'email') {
      body.email = c.email.to
      body.subject = c.email.subject
    }
    const res = await fetch('/api/admin/ghl-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSending(null)
    if (res.ok) {
      setSent(prev => ({ ...prev, [c.id]: true }))
    } else {
      setErrors(prev => ({ ...prev, [c.id]: data.error || 'Send failed' }))
    }
  }

  const daysStuck = (h: number) => {
    if (h < 24) return h + 'h'
    return Math.floor(h / 24) + 'd'
  }

  return (
    <div>
      <SectionHeader
        title="GHL Leads"
        subtitle={batchId ? `Draft batch: ${batchId} · ${contacts.length} leads · ${createdAt ? new Date(createdAt).toLocaleString() : ''}` : 'AI-drafted outreach from GHL pipeline. Edit and send.'}
      />
      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-slate-700 rounded-xl">No leads loaded.</div>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} className={`border rounded-xl overflow-hidden transition-colors ${
              sent[c.id] ? 'border-green-500/40 bg-green-500/5' : 'border-slate-700'
            }`}>
              {/* Row */}
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-700/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm truncate">{c.name}</div>
                    <div className="text-slate-500 text-xs">{c.sms.to}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <Badge color={STAGE_COLORS[c.stage] || 'slate'}>{c.stage}</Badge>
                  <span className={`text-xs font-medium ${
                    c.hoursStuck > 720 ? 'text-red-400' : c.hoursStuck > 168 ? 'text-amber-400' : 'text-slate-400'
                  }`}>{daysStuck(c.hoursStuck)}</span>
                  {sent[c.id] && <span className="text-green-400 text-xs font-bold">✓ Sent</span>}
                  <a href={c.ghlLink} target="_blank" onClick={e => e.stopPropagation()}
                    className="text-slate-500 hover:text-amber-400 text-xs transition-colors">GHL ↗</a>
                  <span className="text-slate-500 text-xs">{expanded === c.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded */}
              {expanded === c.id && (
                <div className="border-t border-slate-700 px-5 py-4 bg-slate-900/40">
                  {/* Channel toggle */}
                  <div className="flex gap-2 mb-3">
                    {(['sms', 'email'] as const).map(ch => (
                      <button key={ch}
                        onClick={() => setChannel(prev => ({ ...prev, [c.id]: ch }))}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          (channel[c.id] || 'sms') === ch
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                            : 'bg-slate-800 border border-slate-600 text-slate-400 hover:text-white'
                        }`}>
                        {ch.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Message editor */}
                  <textarea
                    value={edits[c.id]?.[channel[c.id] || 'sms'] || ''}
                    onChange={e => setEdits(prev => ({ ...prev, [c.id]: { ...prev[c.id], [channel[c.id] || 'sms']: e.target.value } }))}
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-600 focus:border-amber-500 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 resize-none outline-none mb-3"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-xs">
                      {(channel[c.id] || 'sms') === 'email' ? `To: ${c.email.to}` : `To: ${c.sms.to}`}
                    </span>
                    <button
                      onClick={() => send(c)}
                      disabled={sending === c.id || sent[c.id]}
                      className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors ${
                        sent[c.id]
                          ? 'bg-green-600 text-white cursor-default'
                          : 'bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900'
                      }`}
                    >
                      {sending === c.id ? 'Sending…' : sent[c.id] ? '✓ Sent' : `Send ${(channel[c.id] || 'sms').toUpperCase()}`}
                    </button>
                  </div>
                  {errors[c.id] && <p className="text-red-400 text-xs mt-2">{errors[c.id]}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Lead Inbox ─────────────────────────────────────────────────────────────

const QUICK_REPLIES = [
  { label: 'Following up', text: 'Hi {name}, just following up on the stones you were looking at. Any questions I can help with?' },
  { label: 'In stock', text: 'Hi {name}, good news — the stone you saved is in stock and ready for viewing. Want to schedule a time to come in?' },
  { label: 'Ready to quote', text: 'Hi {name}, we have everything we need to put together a quote for you. I\'ll send it over shortly!' },
  { label: 'Book a visit', text: 'Hi {name}, would you like to come see the slabs in person? We\'re in Framingham — happy to set up a time that works for you.' },
]

interface LeadStone {
  stone_id: string
  stone_name: string
  image_url: string | null
  added_at: string
  status: string
}

interface Lead {
  user_id: string
  user_name: string
  user_email: string
  user_phone: string | null
  saved_stones: LeadStone[]
  last_activity: string
}

function LeadInbox() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [message, setMessage] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/leads')
      .then(r => r.json())
      .then(d => { setLeads(d.leads || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const send = async (lead: Lead) => {
    const msg = message[lead.user_id]
    if (!msg?.trim()) return
    const phone = lead.user_phone
    if (!phone) { setError(prev => ({ ...prev, [lead.user_id]: 'No phone number on file' })); return }
    setSending(lead.user_id)
    setError(prev => ({ ...prev, [lead.user_id]: '' }))
    const res = await fetch('/api/admin/ghl-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name: lead.user_name, email: lead.user_email, message: msg })
    })
    const data = await res.json()
    setSending(null)
    if (res.ok) {
      setSent(prev => ({ ...prev, [lead.user_id]: true }))
      setMessage(prev => ({ ...prev, [lead.user_id]: '' }))
      setTimeout(() => setSent(prev => ({ ...prev, [lead.user_id]: false })), 3000)
    } else {
      setError(prev => ({ ...prev, [lead.user_id]: data.error || 'Send failed' }))
    }
  }

  const applyTemplate = (lead: Lead, template: string) => {
    const filled = template.replace('{name}', lead.user_name?.split(' ')[0] || 'there')
    setMessage(prev => ({ ...prev, [lead.user_id]: filled }))
  }

  return (
    <div>
      <SectionHeader
        title="Lead Inbox"
        subtitle="Quarriva users who have saved stones. Fire responses directly to GHL."
      />
      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-slate-700 rounded-xl">
          No leads with saved stones yet.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => (
            <div key={lead.user_id} className="border border-slate-700 rounded-xl overflow-hidden">
              {/* Lead header */}
              <button
                onClick={() => setExpanded(expanded === lead.user_id ? null : lead.user_id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {lead.user_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="text-white font-medium">{lead.user_name}</div>
                    <div className="text-slate-400 text-xs">{lead.user_email} {lead.user_phone ? '· ' + lead.user_phone : '· no phone'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-slate-300 text-xs">{lead.saved_stones?.length || 0} stone{(lead.saved_stones?.length || 0) !== 1 ? 's' : ''} saved</div>
                    <div className="text-slate-500 text-xs">{new Date(lead.last_activity).toLocaleDateString()}</div>
                  </div>
                  <span className="text-slate-500 text-sm">{expanded === lead.user_id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded */}
              {expanded === lead.user_id && (
                <div className="border-t border-slate-700 px-5 py-4 bg-slate-900/40">
                  {/* Saved stones */}
                  <div className="mb-4">
                    <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Saved Stones</p>
                    <div className="flex flex-wrap gap-2">
                      {(lead.saved_stones || []).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                          {s.image_url && <img src={s.image_url} alt={s.stone_name} className="w-6 h-6 rounded object-cover" />}
                          <span className="text-white text-xs font-medium">{s.stone_name}</span>
                          <Badge color={s.status === 'submitted' ? 'green' : 'amber'}>{s.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick reply templates */}
                  <div className="mb-3">
                    <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Quick Replies</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_REPLIES.map(t => (
                        <button key={t.label}
                          onClick={() => applyTemplate(lead, t.text)}
                          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 rounded-lg transition-colors">
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message box */}
                  <div className="flex gap-2">
                    <textarea
                      value={message[lead.user_id] || ''}
                      onChange={e => setMessage(prev => ({ ...prev, [lead.user_id]: e.target.value }))}
                      placeholder={lead.user_phone ? 'Type a message to send via SMS...' : 'No phone on file — message will go via email'}
                      rows={2}
                      className="flex-1 bg-slate-800 border border-slate-600 focus:border-amber-500 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 resize-none outline-none"
                    />
                    <button
                      onClick={() => send(lead)}
                      disabled={!message[lead.user_id]?.trim() || sending === lead.user_id}
                      className="px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold rounded-lg transition-colors text-sm shrink-0"
                    >
                      {sending === lead.user_id ? '...' : sent[lead.user_id] ? '✓ Sent' : 'Send'}
                    </button>
                  </div>
                  {error[lead.user_id] && (
                    <p className="text-red-400 text-xs mt-1">{error[lead.user_id]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Opportunity Board ─────────────────────────────────────────────────────────

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

function OpportunityBoard() {
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
        // Default to first stage that has opportunities
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
        <SectionHeader title="Pipeline Board" subtitle="GHL opportunity pipeline view" />
        <div className="text-slate-500 text-sm py-12 text-center">Loading pipeline…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <SectionHeader title="Pipeline Board" subtitle="GHL opportunity pipeline view" />
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
      <SectionHeader
        title="Pipeline Board"
        subtitle="GHL opportunity pipeline. Move leads, act on suggestions."
      />

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

// ─── Main Admin Page ─────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'opportunity-board', label: '📊 Pipeline Board', component: OpportunityBoard },
  { id: 'ghl-leads', label: '🔥 GHL Leads', component: GHLLeads },
  { id: 'lead-inbox', label: '💬 Quarriva Leads', component: LeadInbox },
  { id: 'customer-quotes', label: '🏠 Customer Quotes', component: CustomerQuoteRequests },
  { id: 'quotes', label: '📋 Lead Quotes', component: QuoteRequests },
  { id: 'featured', label: '⭐ Featured Stones', component: FeaturedStones },
  { id: 'specials', label: '🏷️ Stone Specials', component: StoneSpecials },
  { id: 'pricing', label: '💰 Lead Pricing', component: LeadPricing },
  { id: 'fabricators', label: '🔨 Fabricators', component: Fabricators },
]

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('opportunity-board')

  const ActiveComponent = SECTIONS.find(s => s.id === activeSection)?.component || FeaturedStones

  const handleSignOut = async () => {
    await fetch('/api/admin-logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 mt-1">Manage Quarriva content, pricing, and leads.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar nav */}
          <nav className="md:w-52 shrink-0">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-2 space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeSection === s.id
                      ? 'bg-amber-500/15 text-amber-400 font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content area */}
          <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 min-h-96">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  )
}
// Sat Apr 11 23:09:23 EDT 2026
