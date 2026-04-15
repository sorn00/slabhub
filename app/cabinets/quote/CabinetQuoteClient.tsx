'use client'

import { useState } from 'react'
import Link from 'next/link'

const DOOR_STYLES = [
  { code: 'K8', name: 'Espresso',     styleCategory: 'Transitional', tierName: 'Value'   },
  { code: 'K3', name: 'Greige',       styleCategory: 'Transitional', tierName: 'Value'   },
  { code: 'S8', name: 'White',        styleCategory: 'Contemporary', tierName: 'Classic' },
  { code: 'S5', name: 'Castle Grey',  styleCategory: 'Contemporary', tierName: 'Classic' },
  { code: 'A7', name: 'Crème Glazed', styleCategory: 'Traditional',  tierName: 'Classic' },
  { code: 'S1', name: 'Java Coffee',  styleCategory: 'Traditional',  tierName: 'Classic' },
  { code: 'S2', name: 'Almond',       styleCategory: 'Traditional',  tierName: 'Classic' },
  { code: 'H8', name: 'Hazel',        styleCategory: 'Transitional', tierName: 'Premium' },
  { code: 'H9', name: 'Pearl Glazed', styleCategory: 'Transitional', tierName: 'Premium' },
  { code: 'B5', name: 'Pure',         styleCategory: 'Traditional',  tierName: 'Premium' },
  { code: 'B6', name: 'Pebble',       styleCategory: 'Traditional',  tierName: 'Premium' },
  { code: 'B7', name: 'Naval',        styleCategory: 'Traditional',  tierName: 'Premium' },
  { code: 'B8', name: 'Butterscotch', styleCategory: 'Traditional',  tierName: 'Premium' },
  { code: 'E1', name: 'Dove',         styleCategory: 'Modern',       tierName: 'Elite'   },
  { code: 'E2', name: 'Charcoal',     styleCategory: 'Modern',       tierName: 'Elite'   },
  { code: 'E3', name: 'Sage',         styleCategory: 'Modern',       tierName: 'Elite'   },
]

const NE_STATES = ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island', 'Vermont']

const TIERS = ['Value', 'Classic', 'Premium', 'Elite'] as const
type TierName = (typeof TIERS)[number]

const TIER_BADGE: Record<TierName, string> = {
  Value:   'bg-slate-700 text-slate-300 border-slate-500',
  Classic: 'bg-blue-900/60 text-blue-300 border-blue-700',
  Premium: 'bg-amber-900/60 text-amber-300 border-amber-700',
  Elite:   'bg-purple-900/60 text-purple-300 border-purple-700',
}

export default function CabinetQuoteClient() {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedTiers, setSelectedTiers]   = useState<string[]>([])
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    city: '', state: '',
    projectType: '', roomCount: '1', timeline: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState('')

  const toggleStyle = (code: string) =>
    setSelectedStyles(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])

  const toggleTier = (tier: string) =>
    setSelectedTiers(prev => prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier])

  const upd = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
          cabinet_styles: selectedStyles.join(', '),
          preferred_tier: selectedTiers.join(', '),
          room_count: parseInt(form.roomCount) || 1,
          timeline: form.timeline,
          notes: form.notes,
        }),
      })
      if (!res.ok) throw new Error('Submit failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors'

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-6">
            <span className="text-amber-400 text-3xl">✓</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-4">Quote Request Submitted!</h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            We&apos;ll contact you at <strong className="text-amber-400">{form.email}</strong> within{' '}
            <strong className="text-white">24 hours</strong> with pricing and availability.
          </p>
          <Link href="/cabinets" className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-3 rounded-xl transition-colors">
            ← Back to Configurator
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Header */}
      <section className="border-b border-slate-800 py-12 text-center">
        <h1 className="text-4xl font-extrabold text-white mb-3">Request a Cabinet Quote</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Tell us about your project. We respond within 24 hours with custom pricing — no bot, no runaround.
        </p>
        <p className="text-slate-600 text-sm mt-3">
          Want to build your exact list first?{' '}
          <Link href="/cabinets" className="text-amber-400 hover:text-amber-300 transition-colors">
            Use the configurator →
          </Link>
        </p>
      </section>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Contact */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact Info</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 text-xs mb-1">Full Name *</label>
              <input required type="text" value={form.fullName} onChange={upd('fullName')} placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={upd('email')} placeholder="jane@email.com" className={inputCls} />
            </div>
            <div>
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
          </div>
        </div>

        {/* Project */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Project Details</h2>
          <div className="grid sm:grid-cols-3 gap-4">
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
              <label className="block text-slate-400 text-xs mb-1">Number of Rooms</label>
              <input type="number" min="1" max="10" value={form.roomCount} onChange={upd('roomCount')} className={inputCls} />
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
          </div>
        </div>

        {/* Preferred Tier */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-1 text-sm uppercase tracking-wider">Quality Tier Preference</h2>
          <p className="text-slate-500 text-xs mb-4">Select all that interest you. Your rep will walk you through options.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TIERS.map(tier => {
              const selected = selectedTiers.includes(tier)
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => toggleTier(tier)}
                  className={`border rounded-xl p-3 text-center transition-all ${
                    selected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <span className={`inline-block text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${TIER_BADGE[tier]}`}>
                    {tier}
                  </span>
                  <div className="text-slate-500 text-xs mt-2">
                    {tier === 'Value'   && 'K3, K8'}
                    {tier === 'Classic' && 'S8, S5, A7, S1'}
                    {tier === 'Premium' && 'H8, H9, B-series'}
                    {tier === 'Elite'   && 'E1, E2, E3'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Door Styles */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-1 text-sm uppercase tracking-wider">Preferred Door Styles</h2>
          <p className="text-slate-500 text-xs mb-4">Check any finishes you&apos;re considering. Optional.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOOR_STYLES.map(s => {
              const selected = selectedStyles.includes(s.code)
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => toggleStyle(s.code)}
                  className={`flex items-center gap-2 text-left border rounded-lg px-3 py-2 text-sm transition-all ${
                    selected
                      ? 'border-amber-500/60 bg-amber-500/10 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${selected ? 'bg-amber-500 border-amber-500' : 'border-slate-600'}`}>
                    {selected && <span className="text-slate-900 text-[9px] font-bold">✓</span>}
                  </div>
                  <span>{s.code} — {s.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
          <label className="block text-white font-bold text-sm uppercase tracking-wider mb-3">
            Additional Notes
          </label>
          <textarea
            value={form.notes}
            onChange={upd('notes')}
            placeholder="Room dimensions, cabinet list, special requests, questions about delivery or installation…"
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !form.fullName || !form.email}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-4 rounded-xl text-lg transition-colors shadow-lg shadow-amber-500/20"
        >
          {submitting ? 'Sending…' : 'Submit Quote Request →'}
        </button>
        <p className="text-slate-600 text-xs text-center">
          No commitment. No pricing until you approve. We respond within 24 hours.
        </p>
      </form>
    </div>
  )
}
