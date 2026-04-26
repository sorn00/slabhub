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

const STEPS = ['Business Info', 'Territory', 'Your Business', 'Specialties', 'Payment', 'Confirmation']

export default function FabricatorRegisterPage() {
  const [step, setStep] = useState(0)
  const [stripeCustomerId, setStripeCustomerId] = useState('')
  const [registrationError, setRegistrationError] = useState('')
  const [data, setData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    radius: '50mi',
    // Your Business step
    monthlyJobs: '',
    avgJobValue: '',
    stoneSuppliers: '',
    hasShowroom: '',
    leadTime: '',
    whyLooking: '',
    // Specialties
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
      setRegistrationError('')
      const res = await fetch('/api/register-fabricator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, step: 'pre-payment' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRegistrationError(json.error || 'Registration failed')
        return
      }
      if (json.customerId) setStripeCustomerId(json.customerId)
      next()
    } catch (e) {
      console.error(e)
      setRegistrationError('Registration failed')
    }
  }

  const completeRegistration = async () => {
    try {
      setRegistrationError('')
      const res = await fetch('/api/register-fabricator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, customerId: stripeCustomerId, step: 'payment-complete' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRegistrationError(json.error || 'Registration failed')
        return
      }
      next()
    } catch (e) {
      console.error(e)
      setRegistrationError('Registration failed')
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100
  const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
  const selectClass = "w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Apply to join Quarriva</h1>
        <p className="text-slate-400">One slot per city. Takes under 5 minutes.</p>
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
              <input type="text" placeholder="Street address *" value={data.address} onChange={e => update('address', e.target.value)} className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="City *" value={data.city} onChange={e => update('city', e.target.value)} className={inputClass} />
                <input type="text" placeholder="Zip code *" value={data.zip} onChange={e => update('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} className={inputClass} maxLength={5} />
              </div>
              <button
                onClick={next}
                disabled={!data.businessName || !data.ownerName || !data.phone || !data.email || !data.address || !data.city || !data.zip}
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
                <select value={data.state} onChange={e => update('state', e.target.value)} className={selectClass}>
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

        {/* Step 2: Your Business */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Tell us about your operation</h2>
            <p className="text-slate-400 text-sm mb-6">This helps us match you to the right leads. Takes 60 seconds.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Jobs completed per month</label>
                <select value={data.monthlyJobs} onChange={e => update('monthlyJobs', e.target.value)} className={selectClass}>
                  <option value="">Select range</option>
                  <option value="<5">&lt;5</option>
                  <option value="5-10">5–10</option>
                  <option value="10-20">10–20</option>
                  <option value="20+">20+</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Average job value</label>
                <select value={data.avgJobValue} onChange={e => update('avgJobValue', e.target.value)} className={selectClass}>
                  <option value="">Select range</option>
                  <option value="under-2k">Under $2,000</option>
                  <option value="2k-4k">$2,000–$4,000</option>
                  <option value="4k-7k">$4,000–$7,000</option>
                  <option value="7k+">$7,000+</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Stone suppliers you work with</label>
                <input
                  type="text"
                  placeholder="e.g. MSI, Bedrosians, Arizona Tile, local distributors"
                  value={data.stoneSuppliers}
                  onChange={e => update('stoneSuppliers', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Do you have a showroom?</label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: 'showroom', label: 'Yes — we have a showroom' },
                    { value: 'shop-only', label: 'Shop only' },
                    { value: 'mobile', label: 'Mobile' },
                    { value: 'online-quotes', label: 'Online quotes only' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                      <input
                        type="radio"
                        name="hasShowroom"
                        value={opt.value}
                        checked={data.hasShowroom === opt.value}
                        onChange={() => update('hasShowroom', opt.value)}
                        className="accent-amber-500"
                      />
                      <span className="text-white text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Typical lead time from order to install</label>
                <select value={data.leadTime} onChange={e => update('leadTime', e.target.value)} className={selectClass}>
                  <option value="">Select range</option>
                  <option value="same-week">Same week</option>
                  <option value="1-2-weeks">1–2 weeks</option>
                  <option value="2-4-weeks">2–4 weeks</option>
                  <option value="4-plus-weeks">4+ weeks</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">What&apos;s prompting you to look for new leads?</label>
                <textarea
                  placeholder="What's prompting you to look for new leads right now?"
                  value={data.whyLooking}
                  onChange={e => update('whyLooking', e.target.value)}
                  rows={3}
                  className={inputClass + ' resize-none'}
                />
              </div>
              <button
                onClick={next}
                disabled={!data.monthlyJobs || !data.avgJobValue || !data.hasShowroom || !data.leadTime}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-lg transition-colors mt-2"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Specialties */}
        {step === 3 && (
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
            {registrationError && <p className="text-red-400 text-sm mt-3">{registrationError}</p>}
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Payment Setup</h2>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
              <p className="text-amber-400 text-sm font-medium">💳 How billing works</p>
              <p className="text-slate-400 text-sm mt-1">
                <strong className="text-white">$200</strong> per project with measurements ready for quote + <strong className="text-white">$125</strong> per standard appointment lead.
                <br /><strong className="text-amber-400">One fabricator per city</strong> — first to register owns the territory.
              </p>
            </div>
            <StripePaymentStep
              email={data.email}
              customerId={stripeCustomerId}
              onSuccess={completeRegistration}
            />
            {registrationError && <p className="text-red-400 text-sm mt-3">{registrationError}</p>}
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-3">Application received!</h2>
            <p className="text-slate-400 mb-6">
              We&apos;ll review your application and be in touch within 24 hours. Your market slot is held pending confirmation.
            </p>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left text-sm text-slate-400 space-y-2">
              <p><span className="text-amber-400 font-medium">Business:</span> {data.businessName}</p>
              <p><span className="text-amber-400 font-medium">Address:</span> {data.address}, {data.city}, {data.state} {data.zip}</p>
              <p><span className="text-amber-400 font-medium">Territory:</span> {data.state} · {data.radius}</p>
              <p><span className="text-amber-400 font-medium">Specialties:</span> {data.specialties.join(', ')}</p>
              <p><span className="text-amber-400 font-medium">Plan:</span> $200 projects with measurements + $125 standard appointment leads</p>
            </div>
          </div>
        )}

        {/* Back button */}
        {step > 0 && step < STEPS.length - 1 && step !== 4 && (
          <button onClick={back} className="mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
