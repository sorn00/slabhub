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
      <div className="text-center py-4">
        <div className="text-3xl mb-3">✅</div>
        <h3 className="text-white font-semibold mb-2">Claim Request Submitted!</h3>
        <p className="text-slate-400 text-sm mb-4">
          We&apos;ll verify your ownership and follow up within 1 business day.
        </p>
        <Link href={`/directory/${fabricatorSlug}`} className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
          ← Back to listing
        </Link>
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
        By submitting, you confirm you are authorized to manage this business listing.
      </p>
    </form>
  )
}
