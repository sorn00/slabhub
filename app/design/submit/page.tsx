'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  room_type: string
  room_width: string
  room_length: string
  cabinet_style: string
  cabinet_finish: string
  budget_range: string
  timeline: string
  // Step 2
  stone_preference: string
  color_preference: string
  notes: string
  // Step 3
  name: string
  email: string
  phone: string
  city: string
  state: string
  sketch: File | null
}

const NE_STATES = [
  { value: 'MA', label: 'Massachusetts' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'VT', label: 'Vermont' },
  { value: 'ME', label: 'Maine' },
]

const STEP_LABELS = ['Your Project', 'Stone Preference', 'Contact + Upload']

const inputClass =
  'w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors'

const selectClass =
  'w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors appearance-none'

const labelClass = 'block text-sm font-medium text-slate-300 mb-2'

export default function DesignSubmitPage() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    room_type: 'kitchen',
    room_width: '',
    room_length: '',
    cabinet_style: '',
    cabinet_finish: '',
    budget_range: '',
    timeline: '',
    stone_preference: '',
    color_preference: '',
    notes: '',
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    sketch: null,
  })

  function set(field: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function setFile(file: File | null) {
    setFormData(prev => ({ ...prev, sketch: file }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('room_type', formData.room_type)
      fd.append('room_width', formData.room_width)
      fd.append('room_length', formData.room_length)
      fd.append('cabinet_style', formData.cabinet_style)
      fd.append('cabinet_finish', formData.cabinet_finish)
      fd.append('budget_range', formData.budget_range)
      fd.append('timeline', formData.timeline)
      fd.append('stone_preference', formData.stone_preference)
      fd.append('color_preference', formData.color_preference)
      fd.append('notes', formData.notes)
      fd.append('name', formData.name)
      fd.append('email', formData.email)
      fd.append('phone', formData.phone)
      fd.append('city', formData.city)
      fd.append('state', formData.state)
      if (formData.sketch) {
        fd.append('sketch', formData.sketch)
      }

      const res = await fetch('/api/design/submit', { method: 'POST', body: fd })
      const json = await res.json() as { success?: boolean; error?: string }

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Submission failed. Please try again.')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-white mb-4">Request Received!</h1>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            We received your design request! You&apos;ll hear from us within{' '}
            <strong className="text-amber-400">24-48 hours</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/stones"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Browse Stone Catalog →
            </Link>
            <Link
              href="/design"
              className="text-slate-500 hover:text-slate-300 px-6 py-3 transition-colors"
            >
              ← Back to Design
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/design" className="text-slate-500 hover:text-slate-300 text-sm mb-4 inline-block transition-colors">
            ← Back to Design Service
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-2">
            Start Your Free Design
          </h1>
          <p className="text-slate-400 mt-3">
            Takes about 3 minutes. Our team will be in touch within 24-48 hours.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-10">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1
            const active = step === num
            const done = step > num
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                      ${done ? 'bg-amber-500 text-slate-900' : active ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}
                  >
                    {done ? '✓' : num}
                  </div>
                  <span className={`text-xs hidden sm:block ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-amber-500' : 'bg-slate-700'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Your Project</h2>

              {/* Room type */}
              <div>
                <label className={labelClass}>Room Type</label>
                <div className="flex gap-3">
                  {['kitchen', 'bathroom', 'both'].map(rt => (
                    <label
                      key={rt}
                      className={`flex-1 border rounded-lg px-4 py-3 text-center cursor-pointer transition-colors capitalize
                        ${formData.room_type === rt
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold'
                          : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                    >
                      <input
                        type="radio"
                        name="room_type"
                        value={rt}
                        checked={formData.room_type === rt}
                        onChange={() => set('room_type', rt)}
                        className="sr-only"
                      />
                      {rt === 'both' ? 'Kitchen + Bath' : rt.charAt(0).toUpperCase() + rt.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Room Width (ft)</label>
                  <input
                    type="number"
                    placeholder="e.g. 12"
                    value={formData.room_width}
                    onChange={e => set('room_width', e.target.value)}
                    className={inputClass}
                    min="0"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className={labelClass}>Room Length (ft)</label>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={formData.room_length}
                    onChange={e => set('room_length', e.target.value)}
                    className={inputClass}
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>

              {/* Cabinet style */}
              <div>
                <label className={labelClass}>Cabinet Style Preference</label>
                <div className="relative">
                  <select
                    value={formData.cabinet_style}
                    onChange={e => set('cabinet_style', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select a style...</option>
                    <option value="modern-shaker">Modern / Shaker</option>
                    <option value="traditional">Traditional</option>
                    <option value="transitional">Transitional</option>
                    <option value="farmhouse">Farmhouse</option>
                    <option value="contemporary">Contemporary</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                </div>
              </div>

              {/* Cabinet finish */}
              <div>
                <label className={labelClass}>Cabinet Finish</label>
                <div className="relative">
                  <select
                    value={formData.cabinet_finish}
                    onChange={e => set('cabinet_finish', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select a finish...</option>
                    <option value="white">White</option>
                    <option value="off-white">Off-White</option>
                    <option value="gray">Gray</option>
                    <option value="navy">Navy</option>
                    <option value="natural-wood">Natural Wood</option>
                    <option value="black">Black</option>
                    <option value="two-tone">Two-Tone</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className={labelClass}>Budget Range</label>
                <div className="relative">
                  <select
                    value={formData.budget_range}
                    onChange={e => set('budget_range', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select a budget...</option>
                    <option value="under-5k">Under $5,000</option>
                    <option value="5k-10k">$5,000 – $10,000</option>
                    <option value="10k-20k">$10,000 – $20,000</option>
                    <option value="20k+">$20,000+</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <label className={labelClass}>Timeline</label>
                <div className="relative">
                  <select
                    value={formData.timeline}
                    onChange={e => set('timeline', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select a timeline...</option>
                    <option value="asap">ASAP</option>
                    <option value="1-3-months">1–3 months</option>
                    <option value="3-6-months">3–6 months</option>
                    <option value="just-planning">Just planning</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Stone Preference</h2>

              {/* Stone type */}
              <div>
                <label className={labelClass}>Preferred Stone Type</label>
                <div className="relative">
                  <select
                    value={formData.stone_preference}
                    onChange={e => set('stone_preference', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select a stone type...</option>
                    <option value="quartz">Quartz</option>
                    <option value="granite">Granite</option>
                    <option value="marble">Marble</option>
                    <option value="quartzite">Quartzite</option>
                    <option value="not-sure">Not sure yet</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                </div>
              </div>

              {/* Color preference */}
              <div>
                <label className={labelClass}>Color Preference</label>
                <div className="relative">
                  <select
                    value={formData.color_preference}
                    onChange={e => set('color_preference', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select a color preference...</option>
                    <option value="white-light">White / Light</option>
                    <option value="gray">Gray</option>
                    <option value="beige-cream">Beige / Cream</option>
                    <option value="dark-black">Dark / Black</option>
                    <option value="natural-veined">Natural / Veined</option>
                    <option value="no-preference">No preference</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                </div>
              </div>

              {/* Catalog link */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg px-5 py-4 flex items-center justify-between">
                <span className="text-slate-400 text-sm">Need inspiration?</span>
                <Link
                  href="/stones"
                  target="_blank"
                  className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                >
                  Browse our stone catalog →
                </Link>
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notes / Special Requests</label>
                <textarea
                  value={formData.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Tell us anything else — existing appliances, special features, style inspiration, etc."
                  rows={4}
                  className={inputClass + ' resize-none'}
                />
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Contact Info + Upload</h2>

              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={e => set('name', e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={e => set('email', e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  placeholder="(617) 555-0123"
                  value={formData.phone}
                  onChange={e => set('phone', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    placeholder="Boston"
                    value={formData.city}
                    onChange={e => set('city', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <div className="relative">
                    <select
                      value={formData.state}
                      onChange={e => set('state', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select state...</option>
                      {NE_STATES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                  </div>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className={labelClass}>Upload a Sketch, Photo, or Floor Plan (optional)</label>
                <div className="border-2 border-dashed border-slate-600 hover:border-amber-500/50 rounded-xl p-6 text-center transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    id="sketch-upload"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <label htmlFor="sketch-upload" className="cursor-pointer">
                    <div className="text-3xl mb-2">📎</div>
                    {formData.sketch ? (
                      <div>
                        <p className="text-amber-400 font-medium">{formData.sketch.name}</p>
                        <p className="text-slate-500 text-sm mt-1">Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-300 font-medium">Click to upload</p>
                        <p className="text-slate-500 text-sm mt-1">JPG, PNG, PDF up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-700">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-slate-400 hover:text-slate-200 font-medium transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-3 rounded-lg transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.name || !formData.email}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold px-8 py-3 rounded-lg transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit My Design Request →'}
              </button>
            )}
          </div>
        </div>

        {/* Trust line */}
        <p className="text-center text-slate-600 text-sm mt-6">
          🔒 Your info is private. We&apos;ll only use it to contact you about your design.
        </p>
      </div>
    </div>
  )
}
