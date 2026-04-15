'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DoorStyle {
  code: string
  name: string
  styleCategory: string
  tierNumber: number
  tierName: string
  description: string
  swatchBg: string
  swatchRing: string
}

interface CabinetRow {
  sku: string
  name: string
  category: string
  subcategory: string
  width_inches: number | null
  height_inches: number | null
  depth_inches: number | null
}

interface CabinetListItem {
  sku: string
  name: string
  qty: number
  dimensions: string
}

interface FormData {
  fullName: string
  email: string
  phone: string
  city: string
  state: string
  projectType: string
  timeline: string
  notes: string
}

// ─── Static data ─────────────────────────────────────────────────────────────

const DOOR_STYLES: DoorStyle[] = [
  // Tier 1 — Value
  { code: 'K8', name: 'Espresso',     styleCategory: 'Transitional', tierNumber: 1, tierName: 'Value',   description: 'Rich espresso finish with clean transitional lines',       swatchBg: 'bg-stone-950',   swatchRing: 'ring-stone-700' },
  { code: 'K3', name: 'Greige',       styleCategory: 'Transitional', tierNumber: 1, tierName: 'Value',   description: 'Warm grey-beige blend, endlessly versatile',               swatchBg: 'bg-stone-400',   swatchRing: 'ring-stone-500' },
  // Tier 2 — Classic
  { code: 'S8', name: 'White',        styleCategory: 'Contemporary', tierNumber: 2, tierName: 'Classic', description: 'Crisp white with contemporary flat panel profile',          swatchBg: 'bg-white',       swatchRing: 'ring-slate-300' },
  { code: 'S5', name: 'Castle Grey',  styleCategory: 'Contemporary', tierNumber: 2, tierName: 'Classic', description: 'Sophisticated grey with a modern edge',                    swatchBg: 'bg-slate-500',   swatchRing: 'ring-slate-400' },
  { code: 'A7', name: 'Crème Glazed', styleCategory: 'Traditional',  tierNumber: 2, tierName: 'Classic', description: 'Warm crème with antique glaze detailing',                  swatchBg: 'bg-yellow-100',  swatchRing: 'ring-yellow-200' },
  { code: 'S1', name: 'Java Coffee',  styleCategory: 'Traditional',  tierNumber: 2, tierName: 'Classic', description: 'Deep coffee tone, bold traditional character',             swatchBg: 'bg-stone-800',   swatchRing: 'ring-stone-600' },
  { code: 'S2', name: 'Almond',       styleCategory: 'Traditional',  tierNumber: 2, tierName: 'Classic', description: 'Soft almond hue, timeless and warm',                      swatchBg: 'bg-amber-100',   swatchRing: 'ring-amber-200' },
  // Tier 3 — Premium
  { code: 'H8', name: 'Hazel',        styleCategory: 'Transitional', tierNumber: 3, tierName: 'Premium', description: 'Warm hazel wood tone, sophisticated and livable',          swatchBg: 'bg-amber-700',   swatchRing: 'ring-amber-600' },
  { code: 'H9', name: 'Pearl Glazed', styleCategory: 'Transitional', tierNumber: 3, tierName: 'Premium', description: 'Soft pearl finish with elegant glaze highlights',         swatchBg: 'bg-slate-200',   swatchRing: 'ring-slate-300' },
  { code: 'B5', name: 'Pure',         styleCategory: 'Traditional',  tierNumber: 3, tierName: 'Premium', description: 'Bright pure white with premium raised panel detail',      swatchBg: 'bg-white',       swatchRing: 'ring-slate-200' },
  { code: 'B6', name: 'Pebble',       styleCategory: 'Traditional',  tierNumber: 3, tierName: 'Premium', description: 'Natural pebble grey, earthy and refined',                 swatchBg: 'bg-neutral-400', swatchRing: 'ring-neutral-300' },
  { code: 'B7', name: 'Naval',        styleCategory: 'Traditional',  tierNumber: 3, tierName: 'Premium', description: 'Deep navy, dramatic and timeless',                        swatchBg: 'bg-blue-900',    swatchRing: 'ring-blue-700' },
  { code: 'B8', name: 'Butterscotch', styleCategory: 'Traditional',  tierNumber: 3, tierName: 'Premium', description: 'Warm golden butterscotch, rich and inviting',             swatchBg: 'bg-amber-400',   swatchRing: 'ring-amber-300' },
  // Tier 4 — Elite
  { code: 'E1', name: 'Dove',         styleCategory: 'Modern',       tierNumber: 4, tierName: 'Elite',   description: 'Soft dove grey, frameless Euro-style construction',       swatchBg: 'bg-stone-200',   swatchRing: 'ring-stone-300' },
  { code: 'E2', name: 'Charcoal',     styleCategory: 'Modern',       tierNumber: 4, tierName: 'Elite',   description: 'Deep charcoal with seamless modern geometry',             swatchBg: 'bg-slate-700',   swatchRing: 'ring-slate-500' },
  { code: 'E3', name: 'Sage',         styleCategory: 'Modern',       tierNumber: 4, tierName: 'Elite',   description: "Muted sage green, the designer's current obsession",     swatchBg: 'bg-emerald-200', swatchRing: 'ring-emerald-300' },
]

const CATEGORIES = [
  {
    id: 'Contemporary',
    icon: '▬',
    title: 'Contemporary',
    desc: 'Clean lines, flat panels, minimal hardware. Timeless without being trendy.',
    finishCount: DOOR_STYLES.filter(d => d.styleCategory === 'Contemporary').length,
  },
  {
    id: 'Traditional',
    icon: '⬡',
    title: 'Traditional',
    desc: 'Raised panels, ornate details, rich finishes. Classic American and European.',
    finishCount: DOOR_STYLES.filter(d => d.styleCategory === 'Traditional').length,
  },
  {
    id: 'Transitional',
    icon: '◈',
    title: 'Transitional',
    desc: 'The best of both — soft lines, subtle detail, broad appeal.',
    finishCount: DOOR_STYLES.filter(d => d.styleCategory === 'Transitional').length,
  },
  {
    id: 'Modern',
    icon: '◆',
    title: 'Modern',
    desc: 'Sleek, bold, frameless. Maximizes space and visual impact.',
    finishCount: DOOR_STYLES.filter(d => d.styleCategory === 'Modern').length,
  },
]

const NE_STATES = ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island', 'Vermont']

const SUBCATEGORY_LABELS: Record<string, string> = {
  base:         'Base Cabinets',
  drawer_base:  'Drawer Base',
  sink_base:    'Sink Base',
  farm_sink:    'Farm Sink Base',
  microwave_base:'Microwave Base',
  lazy_susan:   'Lazy Susan Corner',
  corner:       'Corner Base',
  blind_corner: 'Blind Corner',
  specialty:    'Specialty',
  end_corner:   'End Corner',
}

const SUBCATEGORY_ORDER = [
  'base', 'drawer_base', 'sink_base', 'farm_sink',
  'microwave_base', 'lazy_susan', 'corner', 'blind_corner',
  'specialty', 'end_corner',
]

// ─── Tier badge helper ────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    Value:   'bg-slate-700 text-slate-300 border-slate-500',
    Classic: 'bg-blue-900/60 text-blue-300 border-blue-700',
    Premium: 'bg-amber-900/60 text-amber-300 border-amber-700',
    Elite:   'bg-purple-900/60 text-purple-300 border-purple-700',
  }
  return (
    <span className={`inline-block text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${styles[tier] ?? styles.Value}`}>
      {tier}
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const steps = ['Style', 'Finish', 'Cabinets', 'Quote']
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => {
        const n = i + 1
        const active = n === step
        const done = n < step
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done  ? 'bg-amber-500 border-amber-500 text-slate-900' :
                active ? 'bg-amber-500/20 border-amber-500 text-amber-400' :
                         'bg-slate-800 border-slate-700 text-slate-500'
              }`}>
                {done ? '✓' : n}
              </div>
              <span className={`mt-1 text-xs font-medium ${active ? 'text-amber-400' : done ? 'text-amber-600' : 'text-slate-600'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-1 mb-4 transition-colors ${done ? 'bg-amber-500' : 'bg-slate-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Dimensions helper ────────────────────────────────────────────────────────

function fmtDims(c: CabinetRow): string {
  const parts: string[] = []
  if (c.width_inches)  parts.push(`${c.width_inches}" W`)
  if (c.height_inches) parts.push(`${c.height_inches}" H`)
  if (c.depth_inches)  parts.push(`${c.depth_inches}" D`)
  return parts.join(' × ') || '—'
}

// ─── Step 1: Category ─────────────────────────────────────────────────────────

function Step1({
  onSelect,
}: {
  onSelect: (cat: string) => void
}) {
  return (
    <div>
      <h2 className="text-3xl font-extrabold text-white text-center mb-3">What&apos;s your kitchen style?</h2>
      <p className="text-slate-400 text-center mb-10 max-w-lg mx-auto">
        Choose the aesthetic that fits your home. You&apos;ll pick exact finishes next.
      </p>
      <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group text-left bg-slate-800/60 border border-slate-700 hover:border-amber-500/60 hover:bg-slate-800 rounded-2xl p-7 transition-all"
          >
            <div className="text-4xl mb-3 text-amber-400 group-hover:scale-110 transition-transform inline-block">
              {cat.icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{cat.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">{cat.desc}</p>
            <span className="text-amber-500 text-xs font-semibold tracking-wider uppercase">
              {cat.finishCount} finishes available →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Finish ───────────────────────────────────────────────────────────

function Step2({
  category,
  selectedFinishes,
  onToggle,
  onNext,
  onBack,
}: {
  category: string
  selectedFinishes: string[]
  onToggle: (code: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const filtered = DOOR_STYLES.filter(d => d.styleCategory === category)

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-white text-center mb-2">Choose your finish</h2>
      <p className="text-slate-400 text-center mb-8 max-w-lg mx-auto">
        Select up to 3 finishes to include in your quote. Your designer can show you samples.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
        {filtered.map(style => {
          const selected = selectedFinishes.includes(style.code)
          const maxed = selectedFinishes.length >= 3 && !selected
          return (
            <button
              key={style.code}
              onClick={() => !maxed && onToggle(style.code)}
              disabled={maxed}
              className={`text-left border rounded-2xl p-5 transition-all ${
                selected
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
                  : maxed
                  ? 'border-slate-700 opacity-40 cursor-not-allowed'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
              }`}
            >
              {/* Swatch + code */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full ${style.swatchBg} ring-2 ${style.swatchRing} shrink-0`} />
                <div>
                  <div className="text-slate-400 text-xs font-mono mb-0.5">{style.code}</div>
                  <div className="text-white font-bold text-lg leading-tight">{style.name}</div>
                </div>
                {selected && (
                  <div className="ml-auto w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                    <span className="text-slate-900 text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">{style.description}</p>
              <TierBadge tier={style.tierName} />
            </button>
          )
        })}
      </div>

      {selectedFinishes.length >= 3 && (
        <p className="text-center text-amber-400 text-sm mb-4">
          Maximum 3 finishes selected — deselect one to swap.
        </p>
      )}

      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedFinishes.length === 0}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Next: Build Cabinet List →
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Cabinet Builder ──────────────────────────────────────────────────

function Step3({
  cabinets,
  loading,
  cabinetList,
  onAdd,
  onSetQty,
  onNext,
  onBack,
}: {
  cabinets: CabinetRow[]
  loading: boolean
  cabinetList: CabinetListItem[]
  onAdd: (c: CabinetRow) => void
  onSetQty: (sku: string, qty: number) => void
  onNext: () => void
  onBack: () => void
}) {
  const [activeSub, setActiveSub] = useState('base')

  // Group cabinets
  const grouped: Record<string, CabinetRow[]> = {}
  for (const c of cabinets) {
    const key = c.subcategory ?? 'base'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(c)
  }

  const availableSubs = SUBCATEGORY_ORDER.filter(k => grouped[k]?.length)
  const totalItems = cabinetList.reduce((sum, i) => sum + i.qty, 0)
  const displaySubs = [...availableSubs, '_wall']

  const getItem = (sku: string) => cabinetList.find(i => i.sku === sku)

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-white text-center mb-2">Build your cabinet list</h2>
      <p className="text-slate-400 text-center mb-8">
        Add every cabinet you need. Your quote will be itemized.
      </p>

      <div className="flex gap-6 max-w-5xl mx-auto">
        {/* Left nav */}
        <aside className="w-44 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-24">
            {displaySubs.map(sub => {
              const label = sub === '_wall' ? 'Wall Cabinets' : (SUBCATEGORY_LABELS[sub] ?? sub)
              return (
                <button
                  key={sub}
                  onClick={() => sub !== '_wall' && setActiveSub(sub)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    sub === '_wall'
                      ? 'text-slate-600 cursor-default'
                      : activeSub === sub
                      ? 'bg-amber-500/15 text-amber-400 font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {label}
                  {sub === '_wall' && <span className="block text-xs text-slate-700">Coming soon</span>}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Cabinet grid */}
        <div className="flex-1 min-w-0">
          {/* Mobile subcategory select */}
          <div className="md:hidden mb-4">
            <select
              value={activeSub}
              onChange={e => setActiveSub(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {availableSubs.map(sub => (
                <option key={sub} value={sub}>{SUBCATEGORY_LABELS[sub] ?? sub}</option>
              ))}
            </select>
          </div>

          <h3 className="text-white font-bold text-lg mb-4">
            {SUBCATEGORY_LABELS[activeSub] ?? activeSub}
          </h3>

          {loading ? (
            <div className="text-slate-500 py-16 text-center">Loading cabinets…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(grouped[activeSub] ?? []).map(c => {
                const item = getItem(c.sku)
                return (
                  <div
                    key={c.sku}
                    className={`border rounded-xl p-4 transition-colors ${
                      item ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-white font-semibold text-sm">{c.name}</div>
                        <div className="text-slate-500 text-xs font-mono">{c.sku}</div>
                      </div>
                    </div>
                    <div className="text-slate-400 text-xs mb-3">{fmtDims(c)}</div>

                    {item ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSetQty(c.sku, item.qty - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition-colors"
                        >
                          −
                        </button>
                        <span className="text-amber-400 font-bold w-6 text-center">{item.qty}</span>
                        <button
                          onClick={() => onSetQty(c.sku, item.qty + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                        <span className="text-amber-400 text-xs ml-1">Added</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => onAdd(c)}
                        className="text-sm bg-slate-700 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/40 border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all font-medium"
                      >
                        + Add to Project
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom summary bar */}
      <div className="max-w-5xl mx-auto mt-6 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 sticky bottom-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm">
            ← Back
          </button>
          <div className="text-slate-400 text-sm">
            <span className="text-amber-400 font-bold text-lg">{totalItems}</span>{' '}
            {totalItems === 1 ? 'cabinet' : 'cabinets'} in project
          </div>
        </div>
        <button
          onClick={onNext}
          disabled={cabinetList.length === 0}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl transition-colors"
        >
          Review & Get Quote →
        </button>
      </div>
    </div>
  )
}

// ─── Step 4: Summary + Quote Form ─────────────────────────────────────────────

function Step4({
  selectedFinishes,
  cabinetList,
  onBack,
}: {
  selectedFinishes: string[]
  cabinetList: CabinetListItem[]
  onBack: () => void
}) {
  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', phone: '',
    city: '', state: '',
    projectType: '', timeline: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const styles = DOOR_STYLES.filter(d => selectedFinishes.includes(d.code))
  const totalItems = cabinetList.reduce((sum, i) => sum + i.qty, 0)

  const upd = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/cabinets/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          city: form.city,
          state: form.state,
          project_type: form.projectType,
          timeline: form.timeline,
          notes: form.notes,
          cabinet_styles: selectedFinishes.join(', '),
          preferred_tier: styles.map(s => s.tierName).filter((v, i, a) => a.indexOf(v) === i).join(', '),
          cabinet_selections: cabinetList,
        }),
      })
      if (!res.ok) throw new Error('Submit failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors'

  if (submitted) {
    return (
      <div className="text-center py-20 max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-6">
          <span className="text-amber-400 text-3xl">✓</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-4">Quote Request Received!</h2>
        <p className="text-slate-400 text-lg leading-relaxed mb-8">
          We&apos;ll have your custom cabinet quote ready within{' '}
          <strong className="text-white">24 hours</strong>.
          Check your inbox at <strong className="text-amber-400">{form.email}</strong>.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/stones" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors">
            Browse Countertops →
          </Link>
          <Link href="/design" className="border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold px-6 py-3 rounded-xl transition-colors">
            Free Kitchen Design
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-white text-center mb-2">Your project summary</h2>
      <p className="text-slate-400 text-center mb-10">Review your selections and request a quote. Pricing is provided on request.</p>

      <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Left: Summary */}
        <div>
          {/* Finishes */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-4">
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Selected Finishes</h3>
            <div className="space-y-3">
              {styles.map(s => (
                <div key={s.code} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${s.swatchBg} ring-2 ${s.swatchRing} shrink-0`} />
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">{s.name}</div>
                    <div className="text-slate-500 text-xs font-mono">{s.code} · {s.styleCategory}</div>
                  </div>
                  <TierBadge tier={s.tierName} />
                </div>
              ))}
            </div>
          </div>

          {/* Cabinet list */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Cabinet List</h3>
              <span className="text-amber-400 text-sm font-bold">{totalItems} pieces</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {cabinetList.map(item => (
                <div key={item.sku} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white">{item.name}</span>
                    <span className="text-slate-500 text-xs ml-2 font-mono">{item.sku}</span>
                  </div>
                  <span className="text-amber-400 font-bold ml-3 shrink-0">×{item.qty}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-700 mt-4 pt-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">Pricing</span>
              <span className="text-slate-300 font-medium italic">Available on request</span>
            </div>
          </div>
        </div>

        {/* Right: Quote form */}
        <div>
          <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Request Your Quote</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-400 text-xs mb-1">Full Name *</label>
                <input required type="text" value={form.fullName} onChange={upd('fullName')} placeholder="Jane Smith" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 text-xs mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={upd('email')} placeholder="jane@email.com" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 text-xs mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={upd('phone')} placeholder="(555) 000-0000" className={inputCls} />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">City</label>
                <input type="text" value={form.city} onChange={upd('city')} placeholder="Boston" className={inputCls} />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">State</label>
                <select value={form.state} onChange={upd('state')} className={inputCls}>
                  <option value="">Select…</option>
                  {NE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Project Type</label>
                <select value={form.projectType} onChange={upd('projectType')} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="New Kitchen">New Kitchen</option>
                  <option value="Kitchen Remodel">Kitchen Remodel</option>
                  <option value="Bathroom Vanity">Bathroom Vanity</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Timeline</label>
                <select value={form.timeline} onChange={upd('timeline')} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="ASAP">ASAP</option>
                  <option value="1-3 months">1–3 months</option>
                  <option value="3-6 months">3–6 months</option>
                  <option value="Just planning">Just planning</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 text-xs mb-1">Notes / Additional Info</label>
                <textarea
                  value={form.notes}
                  onChange={upd('notes')}
                  placeholder="Room dimensions, special requests, questions…"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={onBack} className="text-slate-400 hover:text-white transition-colors text-sm">
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting || !form.fullName || !form.email}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-colors text-lg"
              >
                {submitting ? 'Sending…' : 'Get My Quote →'}
              </button>
            </div>
            <p className="text-slate-600 text-xs text-center">No commitment. We respond within 24 hours.</p>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CabinetsPage() {
  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([])
  const [cabinetList, setCabinetList] = useState<CabinetListItem[]>([])
  const [cabinets, setCabinets] = useState<CabinetRow[]>([])
  const [loadingCabinets, setLoadingCabinets] = useState(false)
  const [cabinetsFetched, setCabinetsFetched] = useState(false)

  const fetchCabinets = useCallback(async () => {
    if (cabinetsFetched) return
    setLoadingCabinets(true)
    try {
      const res = await fetch('/api/cabinets/list')
      if (res.ok) {
        const data: CabinetRow[] = await res.json()
        setCabinets(data)
        setCabinetsFetched(true)
      }
    } finally {
      setLoadingCabinets(false)
    }
  }, [cabinetsFetched])

  useEffect(() => {
    if (step === 3) fetchCabinets()
  }, [step, fetchCabinets])

  const toggleFinish = (code: string) => {
    setSelectedFinishes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const addCabinet = (c: CabinetRow) => {
    setCabinetList(prev => {
      const existing = prev.find(i => i.sku === c.sku)
      if (existing) return prev.map(i => i.sku === c.sku ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { sku: c.sku, name: c.name, qty: 1, dimensions: fmtDims(c) }]
    })
  }

  const setQty = (sku: string, qty: number) => {
    if (qty <= 0) {
      setCabinetList(prev => prev.filter(i => i.sku !== sku))
    } else {
      setCabinetList(prev => prev.map(i => i.sku === sku ? { ...i, qty } : i))
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Hero */}
      <section className="border-b border-slate-800 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Request a Quote — No Pricing Online
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Cabinet <span className="text-amber-400">Configurator</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Build your exact cabinet list, choose your finish, and get a custom quote in 24 hours.
          </p>
        </div>
      </section>

      {/* Configurator */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <ProgressBar step={step} />

        {step === 1 && (
          <Step1
            onSelect={cat => { setSelectedCategory(cat); setStep(2) }}
          />
        )}

        {step === 2 && (
          <Step2
            category={selectedCategory}
            selectedFinishes={selectedFinishes}
            onToggle={toggleFinish}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3
            cabinets={cabinets}
            loading={loadingCabinets}
            cabinetList={cabinetList}
            onAdd={addCabinet}
            onSetQty={setQty}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <Step4
            selectedFinishes={selectedFinishes}
            cabinetList={cabinetList}
            onBack={() => setStep(3)}
          />
        )}
      </section>

      {/* Footer CTA band */}
      {step === 1 && (
        <section className="border-t border-slate-800 bg-slate-900/40 py-10 text-center">
          <p className="text-slate-500 text-sm mb-3">Already know what you need?</p>
          <Link
            href="/cabinets/quote"
            className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            Skip to quote form →
          </Link>
        </section>
      )}
    </div>
  )
}
