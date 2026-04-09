'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Market {
  city_slug: string
  city_name: string
  state: string
  status: string
  leads_last_30d: number
  partner_name: string | null
}

export default function CityClaimPage() {
  const params = useParams()
  const citySlug = params.city as string

  const [market, setMarket] = useState<Market | null>(null)
  const [nearbyMarkets, setNearbyMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyTaken, setAlreadyTaken] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    website: '',
  })

  useEffect(() => {
    if (!citySlug) return
    fetch(`/api/partners/market?slug=${citySlug}`)
      .then(r => r.json())
      .then(data => {
        setMarket(data.market)
        setNearbyMarkets(data.nearby || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [citySlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/partners/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citySlug, ...form }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (data.status === 'taken') {
      setAlreadyTaken(true)
    } else if (data.ok) {
      setSubmitted(true)
    } else {
      setError(data.error || 'Something went wrong. Please try again.')
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888', fontSize: 16 }}>Loading market data...</div>
      </div>
    )
  }

  if (!market) {
    return (
      <div style={{ background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: '#fff', fontSize: 24 }}>Market not found</div>
        <Link href="/partners" style={{ color: '#d4a847' }}>← Back to all markets</Link>
      </div>
    )
  }

  const isClaimed = market.status === 'claimed'

  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/partners" style={{ color: '#888', fontSize: 14, textDecoration: 'none' }}>
            ← All Markets
          </Link>
        </div>

        {/* Market Header */}
        <div style={{ background: '#1a1a2e', border: `1px solid ${isClaimed ? '#7f1d1d' : '#14532d'}`, borderRadius: 16, padding: '32px', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px' }}>
                {market.city_name}, {market.state}
              </h1>
              <div style={{ fontSize: 14, color: '#888' }}>Exclusive Countertop Lead Territory</div>
            </div>
            <div style={{
              padding: '10px 20px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              background: isClaimed ? '#7f1d1d' : '#14532d',
              color: isClaimed ? '#fca5a5' : '#86efac',
              border: `1px solid ${isClaimed ? '#ef4444' : '#22c55e'}`,
            }}>
              {isClaimed ? '🔴 CLAIMED' : '🟢 AVAILABLE'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 32, marginTop: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d4a847' }}>{market.leads_last_30d}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Leads last 30 days</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d4a847' }}>$200</div>
              <div style={{ fontSize: 13, color: '#888' }}>Per qualified lead</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d4a847' }}>1</div>
              <div style={{ fontSize: 13, color: '#888' }}>Partner per city</div>
            </div>
          </div>
        </div>

        {/* Content based on status */}
        {isClaimed ? (
          <div>
            <div style={{ background: '#1a0f0f', border: '1px solid #7f1d1d', borderRadius: 16, padding: '32px', marginBottom: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#fca5a5' }}>
                This market is taken
              </h2>
              <p style={{ color: '#aaa', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
                {market.partner_name} has exclusive lead rights for {market.city_name}. 
                Join the waitlist and we&apos;ll notify you if this market opens up.
              </p>
              <WaitlistForm citySlug={citySlug} cityName={market.city_name} />
            </div>
          </div>
        ) : submitted ? (
          <div style={{ background: '#0d1f0d', border: '1px solid #14532d', borderRadius: 16, padding: '40px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#86efac' }}>
              Application Submitted!
            </h2>
            <p style={{ color: '#aaa', lineHeight: 1.6 }}>
              We received your application for {market.city_name}. Our team will review and contact you within 24 hours to confirm your exclusive territory.
            </p>
          </div>
        ) : alreadyTaken ? (
          <div style={{ background: '#1a0f0f', border: '1px solid #7f1d1d', borderRadius: 16, padding: '32px', marginBottom: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fca5a5', marginBottom: 12 }}>
              Just Claimed!
            </h2>
            <p style={{ color: '#aaa', lineHeight: 1.6 }}>
              Someone just claimed {market.city_name} seconds ago. Join the waitlist or choose another city.
            </p>
          </div>
        ) : (
          <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 16, padding: '32px', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              Claim {market.city_name} Exclusively
            </h2>
            <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>
              Secure this territory before someone else does. Fill out the form below and we&apos;ll confirm your exclusive rights.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>Company Name *</label>
                  <input
                    required
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    placeholder="Acme Stone & Granite"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>Your Name *</label>
                  <input
                    required
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="John Smith"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>Phone *</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(508) 555-1234"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@yourcompany.com"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>Website (optional)</label>
                  <input
                    value={form.website}
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="https://yourcompany.com"
                    style={inputStyle}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 16, padding: '10px 16px', background: '#7f1d1d33', borderRadius: 8 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: submitting ? '#888' : '#d4a847',
                  color: '#0f1117',
                  fontWeight: 700,
                  fontSize: 16,
                  padding: '14px 32px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  marginTop: 8,
                }}
              >
                {submitting ? 'Submitting...' : `Claim ${market.city_name} Exclusively →`}
              </button>
            </form>
          </div>
        )}

        {/* Nearby available markets */}
        {nearbyMarkets.length > 0 && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#aaa' }}>
              Other Available Markets Nearby
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {nearbyMarkets.map(m => (
                <Link key={m.city_slug} href={`/partners/${m.city_slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#0d1f0d', border: '1px solid #14532d', borderRadius: 10, padding: '16px', cursor: 'pointer' }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{m.city_name}, {m.state}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{m.leads_last_30d} leads/mo · 🟢 Available</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WaitlistForm({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/partners/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citySlug, email, name }),
    })
    setDone(true)
  }

  if (done) return <p style={{ color: '#86efac' }}>✅ You&apos;re on the waitlist for {cityName}!</p>

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      <input
        required
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name"
        style={{ ...inputStyle, width: 160 }}
      />
      <input
        required
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        style={{ ...inputStyle, width: 200 }}
      />
      <button
        type="submit"
        style={{ background: '#d4a847', color: '#0f1117', fontWeight: 700, padding: '11px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}
      >
        Join Waitlist
      </button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f1117',
  border: '1px solid #2a2a4e',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 14,
  boxSizing: 'border-box',
}
