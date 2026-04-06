'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const STEPS = [
  'Project Type',
  'Material',
  'Size',
  'Color',
  'Timeline',
  'Contact Info',
]

function QuoteForm() {
  const searchParams = useSearchParams()
  const initialZip = searchParams.get('zip') || ''

  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [matchedState, setMatchedState] = useState<string | null>(null)
  const [data, setData] = useState({
    projectType: '',
    material: '',
    size: '',
    color: '',
    timeline: '',
    name: '',
    phone: '',
    email: '',
    zip: initialZip,
  })

  const update = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }))

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const submit = async () => {
    setLoading(true)
    try {
      // Call route-lead which handles matching + notification
      const res = await fetch('/api/route-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip: data.zip,
          customerName: data.name,
          phone: data.phone,
          email: data.email,
          material: data.material,
          sqft: data.size,
          stones: [data.color, data.projectType].filter(Boolean),
        }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.matched && result.fabricatorState) {
          setMatchedState(result.fabricatorState)
        }
      }
      // Also save full quote record
      await fetch('/api/save-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {})
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setSubmitted(true) // Still show success
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold text-white mb-4">You're matched!</h2>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          {matchedState
            ? `Great! We're connecting you with our ${matchedState} partner. You'll hear from them within 24 hours.`
            : `We're matching you with fabricators in your area. You'll hear from them within 24 hours.`}
        </p>
        <div className="mt-8 bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 max-w-sm mx-auto">
          <p className="text-amber-400 text-sm font-medium">What happens next?</p>
          <ul className="text-slate-400 text-sm mt-2 space-y-1 text-left list-disc list-inside">
            <li>Fabricators review your project</li>
            <li>They contact you within 24 hours</li>
            <li>Compare quotes and choose your fit</li>
          </ul>
        </div>
      </div>
    )
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 md:p-8">
        {/* Step 0: Project type */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">What type of project?</h2>
            <p className="text-slate-400 mb-6">Select the primary space you're upgrading.</p>
            <div className="grid grid-cols-2 gap-3">
              {['Kitchen', 'Bathroom', 'Island', 'Other'].map(type => (
                <button
                  key={type}
                  onClick={() => { update('projectType', type); next() }}
                  className={`p-4 rounded-xl border text-left transition-all ${data.projectType === type ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-white'}`}
                >
                  <div className="font-medium">{type}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Material */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Material preference?</h2>
            <p className="text-slate-400 mb-6">We'll match you with specialists.</p>
            <div className="grid grid-cols-2 gap-3">
              {['Granite', 'Quartz', 'Marble', 'Not sure'].map(mat => (
                <button
                  key={mat}
                  onClick={() => { update('material', mat); next() }}
                  className={`p-4 rounded-xl border text-left transition-all ${data.material === mat ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-white'}`}
                >
                  <div className="font-medium">{mat}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Size */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Approximate size?</h2>
            <p className="text-slate-400 mb-6">This helps fabricators quote accurately.</p>
            <div className="flex flex-col gap-3">
              {['Under 30 sqft', '30-60 sqft', '60-100 sqft', '100+ sqft'].map(size => (
                <button
                  key={size}
                  onClick={() => { update('size', size); next() }}
                  className={`p-4 rounded-xl border text-left transition-all ${data.size === size ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-white'}`}
                >
                  <div className="font-medium">{size}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Color */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Color preference?</h2>
            <p className="text-slate-400 mb-6">We'll show fabricators your style direction.</p>
            <div className="grid grid-cols-2 gap-3">
              {['White/Cream', 'Gray', 'Black', 'Brown/Beige', 'Blue', 'Not sure'].map(color => (
                <button
                  key={color}
                  onClick={() => { update('color', color); next() }}
                  className={`p-4 rounded-xl border text-left transition-all ${data.color === color ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-white'}`}
                >
                  <div className="font-medium">{color}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Timeline */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">What's your timeline?</h2>
            <p className="text-slate-400 mb-6">Helps fabricators prioritize your request.</p>
            <div className="flex flex-col gap-3">
              {['ASAP', '1-3 months', '3-6 months', 'Just browsing'].map(tl => (
                <button
                  key={tl}
                  onClick={() => { update('timeline', tl); next() }}
                  className={`p-4 rounded-xl border text-left transition-all ${data.timeline === tl ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-white'}`}
                >
                  <div className="font-medium">{tl}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Contact info */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Almost there!</h2>
            <p className="text-slate-400 mb-6">Where should fabricators reach you?</p>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Full name"
                value={data.name}
                onChange={e => update('name', e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={data.phone}
                onChange={e => update('phone', e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="email"
                placeholder="Email address"
                value={data.email}
                onChange={e => update('email', e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="Zip code"
                value={data.zip}
                onChange={e => update('zip', e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={submit}
                disabled={loading || !data.name || !data.email || !data.zip}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors mt-2"
              >
                {loading ? 'Submitting...' : 'Get My Quotes →'}
              </button>
            </div>
          </div>
        )}

        {/* Back button */}
        {step > 0 && step < 5 && (
          <button onClick={back} className="mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← Back
          </button>
        )}
        {step === 5 && (
          <button onClick={back} className="mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}

export default function QuotePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading...</div>}>
      <QuoteForm />
    </Suspense>
  )
}
