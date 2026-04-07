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
        subtitle="All fabricators who have registered on SlabHub. Read-only."
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
}

function CustomerQuoteRequests() {
  const [requests, setRequests] = useState<CustomerQuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')

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
    </div>
  )
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'featured', label: '⭐ Featured Stones', component: FeaturedStones },
  { id: 'specials', label: '🏷️ Stone Specials', component: StoneSpecials },
  { id: 'pricing', label: '💰 Lead Pricing', component: LeadPricing },
  { id: 'fabricators', label: '🔨 Fabricators', component: Fabricators },
  { id: 'quotes', label: '📋 Lead Quotes', component: QuoteRequests },
  { id: 'customer-quotes', label: '🏠 Customer Quotes', component: CustomerQuoteRequests },
]

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('featured')

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
            <p className="text-slate-400 mt-1">Manage SlabHub content, pricing, and leads.</p>
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
