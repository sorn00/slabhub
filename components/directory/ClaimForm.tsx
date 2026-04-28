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
          <h4 className="text-white font-semibold mb-4">Next: first client opportunity</h4>
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
                <p className="text-white text-sm font-medium">We reserve your local listing spot</p>
                <p className="text-slate-400 text-xs leading-relaxed">We confirm your service area and keep the profile connected to your shop.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 text-sm font-bold">3</span>
              <div>
                <p className="text-white text-sm font-medium">You get the first opportunity free</p>
                <p className="text-slate-400 text-xs leading-relaxed">We send your first real countertop client opportunity free, on us, so you can judge the quality.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-5">
          <p className="text-green-200 text-sm leading-relaxed">
            No payment setup is needed right now. After we verify the claim, we will text you about the first free client opportunity.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-5 text-left">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-white text-sm font-semibold">Example lead text</p>
            <span className="text-slate-500 text-xs">Sample</span>
          </div>
          <div className="rounded-2xl rounded-tl-md bg-slate-800 border border-slate-700 p-4">
            <p className="text-slate-200 text-sm leading-relaxed">
              Quarriva opportunity for {fabricatorName}: Local homeowner needs quartz countertops. First client opportunity is free, on us. Reply YES and we will send the details exclusively to your shop.
            </p>
          </div>
          <p className="text-slate-500 text-xs mt-3 leading-relaxed">
            We start with one free opportunity so you can see the quality before deciding if you want more.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/directory/${fabricatorSlug}`}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-colors text-center text-sm"
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
        By submitting, you confirm you are authorized to manage this listing. We will contact you before sending the first free client opportunity.
      </p>
    </form>
  )
}
