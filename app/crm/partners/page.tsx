'use client'

import { useState, useEffect, useCallback } from 'react'

interface Application {
  id: number
  city_slug: string
  city_name: string
  state: string
  company_name: string
  contact_name: string
  phone: string
  email: string
  website: string | null
  status: string
  created_at: string
  market_status: string
}

interface Market {
  id: number
  city_slug: string
  city_name: string
  state: string
  status: string
  partner_name: string | null
  leads_last_30d: number
  claimed_at: string | null
}

function MarketRow({ m, onAction }: { m: Market; onAction: (url: string, body: object) => void }) {
  const [leadsVal, setLeadsVal] = useState(m.leads_last_30d)

  const inputStyle: React.CSSProperties = {
    background: '#0f1117',
    border: '1px solid #2a2a4e',
    borderRadius: 6,
    color: '#fff',
    padding: '4px 8px',
    width: 70,
    fontSize: 13,
  }
  const btnStyle = (color: string, bg: string): React.CSSProperties => ({
    background: bg, color, border: 'none', borderRadius: 6,
    padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
      <td style={{ padding: '12px', fontWeight: 600 }}>{m.city_name}</td>
      <td style={{ padding: '12px', color: '#888' }}>{m.state}</td>
      <td style={{ padding: '12px' }}>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: m.status === 'claimed' ? '#7f1d1d' : '#14532d',
          color: m.status === 'claimed' ? '#fca5a5' : '#86efac',
        }}>
          {m.status === 'claimed' ? '🔴 Claimed' : '🟢 Available'}
        </span>
      </td>
      <td style={{ padding: '12px', color: '#aaa' }}>{m.partner_name || '—'}</td>
      <td style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="number" value={leadsVal} onChange={e => setLeadsVal(Number(e.target.value))} style={inputStyle} />
          <button onClick={() => onAction('/api/partners/admin', { action: 'update-leads', citySlug: m.city_slug, leads: leadsVal })}
            style={{ ...btnStyle('#0f1117', '#d4a847'), padding: '4px 10px' }}>
            Save
          </button>
        </div>
      </td>
      <td style={{ padding: '12px', color: '#888', fontSize: 12 }}>
        {m.claimed_at ? new Date(m.claimed_at).toLocaleDateString() : '—'}
      </td>
      <td style={{ padding: '12px' }}>
        {m.status === 'claimed' && (
          <button onClick={() => onAction('/api/partners/admin', { action: 'reopen', citySlug: m.city_slug })}
            style={btnStyle('#fff', '#78350f')}>Reopen</button>
        )}
      </td>
    </tr>
  )
}

export default function CrmPartnersPage() {
  const [tab, setTab] = useState<'applications' | 'markets'>('applications')
  const [apps, setApps] = useState<Application[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [appsRes, marketsRes] = await Promise.all([
      fetch('/api/partners/admin?type=applications'),
      fetch('/api/partners/admin?type=markets'),
    ])
    const appsData = await appsRes.json()
    const marketsData = await marketsRes.json()
    setApps(appsData.applications || [])
    setMarkets(marketsData.markets || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const action = useCallback(async (url: string, body: object) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (d.ok) {
      setActionMsg('✅ Done')
      loadData()
      setTimeout(() => setActionMsg(''), 3000)
    } else {
      setActionMsg('❌ Error: ' + (d.error || 'Unknown'))
    }
  }, [loadData])

  const btnStyle = (color: string, bg: string): React.CSSProperties => ({
    background: bg, color, border: 'none', borderRadius: 6,
    padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>🏭 Partner Markets</h1>
        {actionMsg && <div style={{ fontSize: 14, color: actionMsg.startsWith('✅') ? '#86efac' : '#fca5a5' }}>{actionMsg}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['applications', 'markets'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: tab === t ? '#d4a847' : '#1a1a2e',
            color: tab === t ? '#0f1117' : '#aaa',
          }}>
            {t === 'applications' ? `Applications (${apps.filter(a => a.status === 'pending').length})` : 'All Markets'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#888' }}>Loading...</div>
      ) : tab === 'applications' ? (
        <div>
          {apps.length === 0 ? (
            <div style={{ color: '#888', padding: 32, textAlign: 'center', background: '#1a1a2e', borderRadius: 12 }}>
              No applications yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a4e', color: '#888', textAlign: 'left' }}>
                    {['City', 'Company', 'Contact', 'Phone', 'Email', 'Website', 'Status', 'Applied', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.map(app => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{app.city_name}, {app.state}</div>
                        <div style={{ fontSize: 11, color: app.market_status === 'claimed' ? '#fca5a5' : '#86efac' }}>
                          Market: {app.market_status}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>{app.company_name}</td>
                      <td style={{ padding: '12px' }}>{app.contact_name}</td>
                      <td style={{ padding: '12px' }}><a href={`tel:${app.phone}`} style={{ color: '#d4a847' }}>{app.phone}</a></td>
                      <td style={{ padding: '12px' }}><a href={`mailto:${app.email}`} style={{ color: '#d4a847' }}>{app.email}</a></td>
                      <td style={{ padding: '12px' }}>
                        {app.website ? <a href={app.website} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a847', fontSize: 12 }}>↗ Link</a> : '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: app.status === 'pending' ? '#78350f' : app.status === 'approved' ? '#14532d' : '#7f1d1d',
                          color: app.status === 'pending' ? '#fde68a' : app.status === 'approved' ? '#86efac' : '#fca5a5',
                        }}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#888', fontSize: 12 }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {app.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => action('/api/partners/admin', { action: 'approve', appId: app.id, citySlug: app.city_slug, partnerName: app.company_name })} style={btnStyle('#0f1117', '#22c55e')}>✓ Approve</button>
                            <button onClick={() => action('/api/partners/admin', { action: 'reject', appId: app.id })} style={btnStyle('#fff', '#ef4444')}>✗ Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a4e', color: '#888', textAlign: 'left' }}>
                {['City', 'State', 'Status', 'Partner', 'Leads/30d', 'Claimed', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {markets.map(m => <MarketRow key={m.id} m={m} onAction={action} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
