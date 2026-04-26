'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  fabricatorId: number
  fabricatorSlug: string
  fabricatorName: string
}

export default function ClaimForm({ fabricatorId, fabricatorSlug, fabricatorName }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const cardSetupUrl = `/fabricators/card-setup?${new URLSearchParams({
    businessName: fabricatorName,
    ownerName: name,
    email,
    phone,
    listingSlug: fabricatorSlug,
  }).toString()}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/directory/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fabricatorId, fabricatorSlug, fabricatorName, name, email, phone, role }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Submission failed')
      }
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="py-2">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-300 text-2xl">
            ✓
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Claim Request Submitted</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your Quarriva listing claim for <span className="text-white font-medium">{fabricatorName}</span> is in review.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-5 mb-5">
          <h4 className="text-white font-semibold mb-4">Next: activate lead claiming</h4>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 text-sm font-bold">1</span>
              <div>
                <p className="text-white text-sm font-medium">We verify the listing owner</p>
                <p className="text-slate-400 text-xs leading-relaxed">We confirm you are authorized to manage this business profile.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 text-sm font-bold">2</span>
              <div>
                <p className="text-white text-sm font-medium">You save a card on file</p>
                <p className="text-slate-400 text-xs leading-relaxed">No monthly retainer and no lead charge today. This only enables accepted lead billing.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 text-sm font-bold">3</span>
              <div>
                <p className="text-white text-sm font-medium">Lead offers arrive by text</p>
                <p className="text-slate-400 text-xs leading-relaxed">Reply YES to accept the lead exclusively. Projects with measurements ready for quote are $200 and standard appointment leads are $125.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-5">
          <p className="text-blue-200 text-sm leading-relaxed">
            Card setup is for future accepted leads only. You are charged after you accept a specific lead offer.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-5 text-left">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-white text-sm font-semibold">Example lead text</p>
            <span className="text-slate-500 text-xs">Sample</span>
          </div>
          <div className="rounded-2xl rounded-tl-md bg-slate-800 border border-slate-700 p-4">
            <p className="text-slate-200 text-sm leading-relaxed">
              Exclusive Quarriva lead for {fabricatorName}: Bridgeport homeowner needs quartz countertops. Project with measurements ready for quote, $200 if accepted. Reply YES to claim exclusively or PASS to skip.
            </p>
          </div>
          <p className="text-slate-500 text-xs mt-3 leading-relaxed">
            Lead details are sent after you accept, and accepted leads are sent exclusively to your shop.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={cardSetupUrl}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-colors text-center text-sm"
          >
            Set Up Card for Lead Claims
          </Link>
          <Link
            href={`/directory/${fabricatorSlug}`}
            className="w-full border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium py-3 rounded-xl transition-colors text-center text-sm"
          >
            Back to Listing
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1">Full Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          required
          className="w-full bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1">Email Address *</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1">Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="(555) 000-0000"
          className="w-full bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium block mb-1">Your Role *</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          required
          className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        >
          <option value="">Select your role</option>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold py-3 rounded-xl transition-colors text-sm mt-2"
      >
        {loading ? 'Submitting...' : 'Submit Claim Request'}
      </button>
      <p className="text-slate-500 text-xs text-center">
        By submitting, you confirm you are authorized to manage this listing. Lead charges only happen after you accept a lead offer.
      </p>
    </form>
  )
}
