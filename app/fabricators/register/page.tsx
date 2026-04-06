'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const StripePaymentStep = dynamic(() => import('@/components/StripePaymentStep'), { ssr: false })

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming'
]

const STEPS = ['Business Info', 'Territory', 'Specialties', 'Payment', 'Confirmation']

export default function FabricatorRegisterPage() {
  const [step, setStep] = useState(0)
  const [stripeCustomerId, setStripeCustomerId] = useState('')
  const [data, setData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    website: '',
    state: '',
    radius: '50mi',
    specialties: [] as string[],
  })

  const update = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }))
  const toggleSpecialty = (s: string) => {
    setData(prev => {
      const current = prev.specialties
      if (s === 'All') return { ...prev, specialties: current.includes('All') ? [] : ['All'] }
      const filtered = current.filter(x => x !== 'All')
      return {
        ...prev,
        specialties: filtered.includes(s) ? filtered.filter(x => x !== s) : [...filtered, s]
      }
    })
  }

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const saveAndContinue = async () => {
    // Create Stripe customer when moving to payment step
    try {
      const res = await fetch('/api/register-fabricator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, step: 'pre-payment' }),
      })
      const json = await res.json()
      if (json.customerId) setStripeCustomerId(json.customerId)
    } catch (e) {
      console.error(e)
    }
    next()
  }

  const progress = ((step + 1) / STEPS.length) * 100
  const inputClass = "w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Start receiving leads</h1>
        <p className="text-slate-400">Join SlabHub's fabricator network. Setup takes under 5 minutes.</p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 md:p-8">
        {/* Step 0: Business Info */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Business Information</h2>
            <div className="flex flex-col gap-4">
              <input type="text" placeholder="Business name *" value={data.businessName} onChange={e => update('businessName', e.target.value)} className={inputClass} />
              <input type="text" placeholder="Owner name *" value={data.ownerName} onChange={e => update('ownerName', e.target.value)} className={inputClass} />
              <input type="tel" placeholder="Phone number *" value={data.phone} onChange={e => update('phone', e.target.value)} className={inputClass} />
              <input type="email" placeholder="Email address *" value={data.email} onChange={e => update('email', e.target.value)} className={inputClass} />
              <input type="url" placeholder="Website (optional)" value={data.website} onChange={e => update('website', e.target.value)} className={inputClass} />
              <button
                onClick={next}
                disabled={!data.businessName || !data.ownerName || !data.phone || !data.email}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors mt-2"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Territory */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Service Territory</h2>
            <p className="text-slate-400 text-sm mb-6">We'll only send you leads within your coverage area.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">State *</label>
                <select value={data.state} onChange={e => update('state', e.target.value)} className={inputClass}>
                  <option value="">Select your state</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Coverage radius</label>
                <div className="grid grid-cols-2 gap-2">
                  {['25mi', '50mi', '100mi', 'Statewide'].map(r => (
                    <button
                      key={r}
                      onClick={() => update('radius', r)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${data.radius === r ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={next}
                disabled={!data.state}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors mt-2"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Specialties */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Material Specialties</h2>
            <p className="text-slate-400 text-sm mb-6">Select all materials your shop works with.</p>
            <div className="flex flex-col gap-3 mb-6">
              {['Granite', 'Quartz', 'Marble', 'Quartzite', 'All'].map(s => (
                <label key={s} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.specialties.includes(s)}
                    onChange={() => toggleSpecialty(s)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-white">{s === 'All' ? 'All materials' : s}</span>
                </label>
              ))}
            </div>
            <button
              onClick={saveAndContinue}
              disabled={data.specialties.length === 0}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg w-full transition-colors"
            >
              Continue to Payment →
            </button>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Payment Setup</h2>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
              <p className="text-amber-400 text-sm font-medium">💳 How billing works</p>
              <p className="text-slate-400 text-sm mt-1">
                Your card will be charged <strong className="text-white">$200</strong> each time we deliver a qualified lead to you.
                <br /><strong className="text-amber-400">No charge today</strong> — only when leads are delivered.
              </p>
            </div>
            <StripePaymentStep
              email={data.email}
              customerId={stripeCustomerId}
              onSuccess={() => next()}
            />
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-3">You're registered!</h2>
            <p className="text-slate-400 mb-6">
              We'll notify you when leads are available in your area. Your first lead could arrive within hours.
            </p>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left text-sm text-slate-400 space-y-2">
              <p><span className="text-amber-400 font-medium">Business:</span> {data.businessName}</p>
              <p><span className="text-amber-400 font-medium">Territory:</span> {data.state} · {data.radius}</p>
              <p><span className="text-amber-400 font-medium">Specialties:</span> {data.specialties.join(', ')}</p>
              <p><span className="text-amber-400 font-medium">Lead price:</span> $200 per delivery</p>
            </div>
          </div>
        )}

        {/* Back button */}
        {step > 0 && step < 4 && step !== 3 && (
          <button onClick={back} className="mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
