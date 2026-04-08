'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface StonePrice {
  id?: number
  stone_id: string
  stone_name: string
  material?: string | null
  dealer_cost_sqft?: number | null
  retail_sqft?: number | null
  slab_width_inches?: number | null
  slab_height_inches?: number | null
  notes?: string | null
  updated_at?: string | null
  updated_by?: string | null
}

const MATERIALS = ['all', 'quartz', 'granite', 'marble', 'quartzite'] as const

function markupPct(dealer: number | null | undefined, retail: number | null | undefined): string {
  if (!dealer || !retail || dealer === 0) return '—'
  const pct = ((retail - dealer) / dealer) * 100
  return pct.toFixed(1) + '%'
}

function markupColor(dealer: number | null | undefined, retail: number | null | undefined): string {
  if (!dealer || !retail || dealer === 0) return 'text-slate-500'
  const pct = ((retail - dealer) / dealer) * 100
  if (pct >= 30) return 'text-green-400'
  if (pct >= 15) return 'text-yellow-400'
  return 'text-red-400'
}

interface EditState {
  dealer: string
  retail: string
  slabW: string
  slabH: string
  notes: string
}

export default function PricingClient({ userName }: { userName: string }) {
  const [stones, setStones] = useState<StonePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [search, setSearch] = useState('')
  const [materialFilter, setMaterialFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ dealer: '', retail: '', slabW: '130', slabH: '79', notes: '' })
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/crm/pricing')
      if (!r.ok) throw new Error('Failed to load')
      const data: StonePrice[] = await r.json()
      setStones(data)
    } catch {
      showToast('Failed to load prices', 'err')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const r = await fetch('/api/crm/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })
      const data = await r.json()
      showToast(data.message || 'Done', 'ok')
      await load()
    } catch {
      showToast('Seed failed', 'err')
    } finally {
      setSeeding(false)
    }
  }

  const startEdit = (s: StonePrice) => {
    setEditingId(s.stone_id)
    setEditState({
      dealer: s.dealer_cost_sqft != null ? String(s.dealer_cost_sqft) : '',
      retail: s.retail_sqft != null ? String(s.retail_sqft) : '',
      slabW: s.slab_width_inches != null ? String(s.slab_width_inches) : '130',
      slabH: s.slab_height_inches != null ? String(s.slab_height_inches) : '79',
      notes: s.notes || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveRow = async (stoneId: string) => {
    setSaving(stoneId)
    try {
      const payload = {
        dealer_cost_sqft: editState.dealer !== '' ? parseFloat(editState.dealer) : null,
        retail_sqft: editState.retail !== '' ? parseFloat(editState.retail) : null,
        slab_width_inches: editState.slabW !== '' ? parseFloat(editState.slabW) : null,
        slab_height_inches: editState.slabH !== '' ? parseFloat(editState.slabH) : null,
        notes: editState.notes || null,
      }
      const r = await fetch(`/api/crm/pricing/${encodeURIComponent(stoneId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error('Save failed')
      const updated: StonePrice = await r.json()
      setStones(prev => prev.map(s => s.stone_id === stoneId ? updated : s))
      setEditingId(null)
      showToast('Saved ✓')
    } catch {
      showToast('Save failed', 'err')
    } finally {
      setSaving(null)
    }
  }

  const filtered = stones.filter(s => {
    if (materialFilter !== 'all' && s.material !== materialFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!s.stone_name.toLowerCase().includes(q) && !s.stone_id.toLowerCase().includes(q)) return false
    }
    return true
  })

  const pricedCount = stones.filter(s => s.retail_sqft != null).length

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-slate-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-amber-400 font-bold text-xl">◆ Quarriva</Link>
            <span className="text-slate-600">/</span>
            <Link href="/crm" className="text-slate-400 hover:text-white text-sm">CRM</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">💰 Pricing</span>
          </div>
          <span className="text-slate-400 text-sm hidden sm:block">{userName}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats + actions */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex gap-4 text-sm">
            <span className="text-slate-400">
              <span className="text-white font-semibold">{stones.length}</span> stones total
            </span>
            <span className="text-slate-400">
              <span className="text-green-400 font-semibold">{pricedCount}</span> priced
            </span>
            <span className="text-slate-400">
              <span className="text-yellow-400 font-semibold">{stones.length - pricedCount}</span> unpriced
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding || loading}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {seeding ? 'Importing…' : '📥 Import from Catalog'}
            </button>

            <div title="Coming soon — MSI portal integration">
              <button
                disabled
                className="px-3 py-1.5 text-sm bg-slate-700 text-slate-500 cursor-not-allowed rounded-lg"
              >
                🔗 Populate from MSI
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search stones…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1a1a2e] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-64"
          />
          <div className="flex gap-1">
            {MATERIALS.map(m => (
              <button
                key={m}
                onClick={() => setMaterialFilter(m)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                  materialFilter === m
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white bg-[#1a1a2e] border border-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-slate-500">Loading prices…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-3xl mb-2">🪨</div>
              <div>{stones.length === 0 ? 'No stones loaded yet — click "Import from Catalog"' : 'No stones match your filters'}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Stone Name</th>
                    <th className="text-left px-4 py-3">Material</th>
                    <th className="text-left px-4 py-3">Slab Size</th>
                    <th className="text-right px-4 py-3">Dealer Cost</th>
                    <th className="text-right px-4 py-3">Retail $/sqft</th>
                    <th className="text-right px-4 py-3">Markup %</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const isEditing = editingId === s.stone_id
                    const isSaving = saving === s.stone_id

                    // Live markup preview during edit
                    const previewDealer = isEditing && editState.dealer !== '' ? parseFloat(editState.dealer) : s.dealer_cost_sqft
                    const previewRetail = isEditing && editState.retail !== '' ? parseFloat(editState.retail) : s.retail_sqft

                    return (
                      <tr
                        key={s.stone_id}
                        className={`border-b border-slate-800 transition-colors ${
                          isEditing ? 'bg-amber-500/5' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Stone Name */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{s.stone_name}</div>
                          <div className="text-xs text-slate-500">{s.stone_id}</div>
                        </td>

                        {/* Material */}
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${
                            s.material === 'quartz' ? 'bg-blue-500/20 text-blue-300' :
                            s.material === 'granite' ? 'bg-orange-500/20 text-orange-300' :
                            s.material === 'marble' ? 'bg-purple-500/20 text-purple-300' :
                            s.material === 'quartzite' ? 'bg-green-500/20 text-green-300' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {s.material || '—'}
                          </span>
                        </td>

                        {/* Slab Size */}
                        <td className="px-4 py-3 text-slate-300">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editState.slabW}
                                onChange={e => setEditState(prev => ({ ...prev, slabW: e.target.value }))}
                                className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                                placeholder="130"
                              />
                              <span className="text-slate-500 text-xs">×</span>
                              <input
                                type="number"
                                value={editState.slabH}
                                onChange={e => setEditState(prev => ({ ...prev, slabH: e.target.value }))}
                                className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                                placeholder="79"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">
                              {s.slab_width_inches ?? 130}&quot; × {s.slab_height_inches ?? 79}&quot;
                            </span>
                          )}
                        </td>

                        {/* Dealer Cost */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editState.dealer}
                              onChange={e => setEditState(prev => ({ ...prev, dealer: e.target.value }))}
                              className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500 text-right"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className={s.dealer_cost_sqft != null ? 'text-slate-300' : 'text-slate-600'}>
                              {s.dealer_cost_sqft != null ? `$${s.dealer_cost_sqft.toFixed(2)}` : '—'}
                            </span>
                          )}
                        </td>

                        {/* Retail $/sqft */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editState.retail}
                              onChange={e => setEditState(prev => ({ ...prev, retail: e.target.value }))}
                              className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500 text-right"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className={s.retail_sqft != null ? 'text-amber-300 font-medium' : 'text-slate-600'}>
                              {s.retail_sqft != null ? `$${s.retail_sqft.toFixed(2)}` : '—'}
                            </span>
                          )}
                        </td>

                        {/* Markup % */}
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${markupColor(previewDealer, previewRetail)}`}>
                            {markupPct(previewDealer, previewRetail)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => saveRow(s.stone_id)}
                                disabled={isSaving}
                                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                              >
                                {isSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(s)}
                              className="px-3 py-1 text-xs bg-slate-700 hover:bg-amber-600 text-white rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-600 text-center">
          Fabrication rate is always $30/sqft (fixed). Slab default: 130″ × 79″.
        </p>
      </div>
    </div>
  )
}
