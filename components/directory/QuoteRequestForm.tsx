'use client'

import { useState } from 'react'

interface Props {
  fabricatorId: number
  fabricatorName: string
  city: string
}

export default function QuoteRequestForm({ fabricatorId, fabricatorName, city }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [projectType, setProjectType] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/directory/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fabricatorId, fabricatorName, city, name, email, phone, projectType, message }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
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
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">✅</div>
        <h3 className="text-white font-semibold mb-1">Request Sent!</h3>
        <p className="text-slate-400 text-sm">We&apos;ve forwarded your quote request to {fabricatorName}. They&apos;ll be in touch soon.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6">
      <h3 className="text-white font-semibold text-base mb-4">Get a Free Quote</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          required
          className="bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
          required
          className="bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        />
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone number"
          className="bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        />
        <select
          value={projectType}
          onChange={e => setProjectType(e.target.value)}
          className="bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
        >
          <option value="">Project type (optional)</option>
          <option value="kitchen">Kitchen Countertops</option>
          <option value="bathroom">Bathroom Vanity</option>
          <option value="outdoor">Outdoor Kitchen</option>
          <option value="fireplace">Fireplace Surround</option>
          <option value="other">Other</option>
        </select>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell us about your project..."
          rows={3}
          className="bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm resize-none"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Sending...' : 'Send Quote Request'}
        </button>
      </form>
    </div>
  )
}
