'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Market {
  city_slug: string
  city_name: string
  state: string
  status: string
  leads_last_30d: number
  partner_name: string | null
}

const STATE_NAMES: Record<string, string> = {
  MA: '🏔️ Massachusetts',
  CT: '🌳 Connecticut',
  NY: '🗽 New York',
  FL: '🌴 Florida',
  TX: '⭐ Texas',
}

// Additional NY/FL/TX cities for the full map (static since not in DB yet)
const EXTRA_MARKETS: Market[] = [
  // NY
  { city_slug: 'manhattan-ny', city_name: 'Manhattan', state: 'NY', status: 'available', leads_last_30d: 42, partner_name: null },
  { city_slug: 'brooklyn-ny', city_name: 'Brooklyn', state: 'NY', status: 'available', leads_last_30d: 38, partner_name: null },
  { city_slug: 'white-plains-ny', city_name: 'White Plains', state: 'NY', status: 'available', leads_last_30d: 22, partner_name: null },
  { city_slug: 'scarsdale-ny', city_name: 'Scarsdale', state: 'NY', status: 'available', leads_last_30d: 18, partner_name: null },
  { city_slug: 'great-neck-ny', city_name: 'Great Neck', state: 'NY', status: 'available', leads_last_30d: 15, partner_name: null },
  { city_slug: 'garden-city-ny', city_name: 'Garden City', state: 'NY', status: 'available', leads_last_30d: 20, partner_name: null },
  // FL
  { city_slug: 'miami-fl', city_name: 'Miami', state: 'FL', status: 'available', leads_last_30d: 45, partner_name: null },
  { city_slug: 'boca-raton-fl', city_name: 'Boca Raton', state: 'FL', status: 'available', leads_last_30d: 33, partner_name: null },
  { city_slug: 'naples-fl', city_name: 'Naples', state: 'FL', status: 'available', leads_last_30d: 28, partner_name: null },
  { city_slug: 'fort-lauderdale-fl', city_name: 'Fort Lauderdale', state: 'FL', status: 'available', leads_last_30d: 36, partner_name: null },
  { city_slug: 'palm-beach-fl', city_name: 'Palm Beach', state: 'FL', status: 'available', leads_last_30d: 24, partner_name: null },
  { city_slug: 'sarasota-fl', city_name: 'Sarasota', state: 'FL', status: 'available', leads_last_30d: 19, partner_name: null },
  // TX
  { city_slug: 'houston-tx', city_name: 'Houston', state: 'TX', status: 'available', leads_last_30d: 44, partner_name: null },
  { city_slug: 'dallas-tx', city_name: 'Dallas', state: 'TX', status: 'available', leads_last_30d: 41, partner_name: null },
  { city_slug: 'austin-tx', city_name: 'Austin', state: 'TX', status: 'available', leads_last_30d: 38, partner_name: null },
  { city_slug: 'plano-tx', city_name: 'Plano', state: 'TX', status: 'available', leads_last_30d: 27, partner_name: null },
  { city_slug: 'frisco-tx', city_name: 'Frisco', state: 'TX', status: 'available', leads_last_30d: 23, partner_name: null },
  { city_slug: 'the-woodlands-tx', city_name: 'The Woodlands', state: 'TX', status: 'available', leads_last_30d: 21, partner_name: null },
]

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState<string>('ALL')

  useEffect(() => {
    fetch('/api/partners/admin?type=markets')
      .then(r => r.json())
      .then(data => {
        const dbMarkets: Market[] = (data.markets || []).map((m: Market) => ({
          city_slug: m.city_slug,
          city_name: m.city_name,
          state: m.state,
          status: m.status,
          leads_last_30d: m.leads_last_30d,
          partner_name: m.partner_name,
        }))
        // Merge DB + extra, avoid duplicates
        const slugs = new Set(dbMarkets.map(m => m.city_slug))
        const combined = [...dbMarkets, ...EXTRA_MARKETS.filter(m => !slugs.has(m.city_slug))]
        setMarkets(combined)
        setLoading(false)
      })
      .catch(() => {
        setMarkets(EXTRA_MARKETS)
        setLoading(false)
      })
  }, [])

  const states = ['ALL', 'MA', 'CT', 'NY', 'FL', 'TX']
  const filtered = stateFilter === 'ALL' ? markets : markets.filter(m => m.state === stateFilter)
  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.state]) acc[m.state] = []
    acc[m.state].push(m)
    return acc
  }, {} as Record<string, Market[]>)

  const available = markets.filter(m => m.status === 'available').length
  const claimed = markets.filter(m => m.status === 'claimed').length

  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/partners" style={{ color: '#888', fontSize: 14, textDecoration: 'none' }}>← Partner Home</Link>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '16px 0 8px' }}>All Available Markets</h1>
          <p style={{ color: '#888', marginBottom: 24 }}>
            <span style={{ color: '#4ade80' }}>{available} open</span> · <span style={{ color: '#ef4444' }}>{claimed} claimed</span> · {markets.length} total
          </p>

          {/* State filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {states.map(s => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: stateFilter === s ? '#d4a847' : '#1a1a2e',
                  color: stateFilter === s ? '#0f1117' : '#aaa',
                }}
              >
                {s === 'ALL' ? 'All States' : `${STATE_NAMES[s]?.slice(2) || s} (${markets.filter(m => m.state === s).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#888' }}>Loading markets...</div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([state, stateMarkets]) => (
              <div key={state} style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#d4a847', marginBottom: 20 }}>
                  {STATE_NAMES[state] || state}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {stateMarkets.map(m => (
                    <div key={m.city_slug} style={{
                      background: m.status === 'claimed' ? '#1a0f0f' : '#0d1f0d',
                      border: `1px solid ${m.status === 'claimed' ? '#7f1d1d' : '#14532d'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{m.city_name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: m.status === 'claimed' ? '#7f1d1d' : '#14532d',
                          color: m.status === 'claimed' ? '#fca5a5' : '#86efac',
                        }}>
                          {m.status === 'claimed' ? '🔴' : '🟢'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                        {m.status === 'claimed' ? m.partner_name : `${m.leads_last_30d} leads/mo`}
                      </div>
                      {m.status === 'available' && (
                        <Link
                          href={`/partners/${m.city_slug}`}
                          style={{
                            display: 'block',
                            textAlign: 'center',
                            background: '#d4a847',
                            color: '#0f1117',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '6px',
                            borderRadius: 6,
                            textDecoration: 'none',
                          }}
                        >
                          Claim →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
