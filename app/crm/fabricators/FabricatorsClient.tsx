'use client'

import { useState, useEffect, useCallback } from 'react'

interface Contact {
  id: string
  name: string
  company: string
  phone: string
  state: string
  dateAdded: string
}

interface FabData {
  total: number
  sampleSize: number
  stateCounts: Record<string, number>
  cityCounts: Array<{
    city: string
    state: string
    stateCode: string
    count: number
    claimed: number
    available: number
  }>
  directoryTotal: number
  contacts: Contact[]
  totalFiltered: number
  page: number
  pageSize: number
  ghlError?: string | null
}

interface PartnerStats {
  claimed: number
  available: number
  pending: number
}

const EMPTY_DATA: FabData = {
  total: 0,
  sampleSize: 0,
  stateCounts: { MA: 0, CT: 0, NY: 0, FL: 0, TX: 0, Other: 0 },
  cityCounts: [],
  directoryTotal: 0,
  contacts: [],
  totalFiltered: 0,
  page: 1,
  pageSize: 50,
  ghlError: null,
}

// City picker modal for single contact outreach
function CityModal({
  contact,
  onClose,
  onStage,
}: {
  contact: Contact
  onClose: () => void
  onStage: (city: string, citySlug: string) => Promise<void>
}) {
  const CT_CITIES = [
    { name: 'Hartford', slug: 'hartford' },
    { name: 'New Haven', slug: 'new-haven' },
    { name: 'Stamford', slug: 'stamford' },
    { name: 'Bridgeport', slug: 'bridgeport' },
    { name: 'Waterbury', slug: 'waterbury' },
    { name: 'Norwalk', slug: 'norwalk' },
    { name: 'Danbury', slug: 'danbury' },
    { name: 'Fairfield', slug: 'fairfield' },
    { name: 'Greenwich', slug: 'greenwich' },
    { name: 'Westport', slug: 'westport' },
  ]
  const MA_CITIES = [
    { name: 'Boston', slug: 'boston' },
    { name: 'Worcester', slug: 'worcester' },
    { name: 'Springfield', slug: 'springfield' },
    { name: 'Cambridge', slug: 'cambridge' },
    { name: 'Lowell', slug: 'lowell' },
    { name: 'Brockton', slug: 'brockton' },
    { name: 'New Bedford', slug: 'new-bedford' },
    { name: 'Quincy', slug: 'quincy' },
    { name: 'Lynn', slug: 'lynn' },
    { name: 'Fall River', slug: 'fall-river' },
  ]

  const cities = contact.state === 'CT' ? CT_CITIES : contact.state === 'MA' ? MA_CITIES : CT_CITIES
  const [selected, setSelected] = useState(cities[0].slug)
  const [staging, setStaging] = useState(false)
  const [done, setDone] = useState(false)

  const handleStage = async () => {
    setStaging(true)
    const city = cities.find(c => c.slug === selected)
    if (city) {
      await onStage(city.name, city.slug)
    }
    setStaging(false)
    setDone(true)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 12,
          padding: 28, width: 380, maxWidth: '90vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 18 }}>Send City Link</h3>
        <p style={{ color: '#888', margin: '0 0 20px', fontSize: 13 }}>
          {contact.company} · {contact.name} · {contact.phone}
        </p>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ color: '#86efac', fontWeight: 600 }}>Staged for approval</div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Check Messages to review &amp; send</div>
            <button
              onClick={onClose}
              style={{
                marginTop: 20, background: '#d4a847', color: '#0f1117',
                border: 'none', borderRadius: 8, padding: '8px 24px',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 8 }}>
              Pick available city:
            </label>
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              style={{
                width: '100%', background: '#0f1117', border: '1px solid #2a2a4e',
                borderRadius: 8, color: '#fff', padding: '8px 12px',
                fontSize: 14, marginBottom: 16,
              }}
            >
              {cities.map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>

            <div style={{
              background: '#0f1117', border: '1px solid #2a2a4e', borderRadius: 8,
              padding: '10px 12px', marginBottom: 20, fontSize: 12, color: '#aaa',
              lineHeight: 1.5,
            }}>
              <strong style={{ color: '#d4a847' }}>Preview SMS:</strong><br />
              Hi {contact.name} — {cities.find(c => c.slug === selected)?.name} {contact.state} is available for exclusive countertop leads. One partner only. quarriva.com/partners/{selected}-{contact.state.toLowerCase()}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, background: '#2a2a4e', color: '#aaa',
                  border: 'none', borderRadius: 8, padding: '10px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStage}
                disabled={staging}
                style={{
                  flex: 2, background: '#d4a847', color: '#0f1117',
                  border: 'none', borderRadius: 8, padding: '10px',
                  fontWeight: 700, cursor: staging ? 'not-allowed' : 'pointer',
                  opacity: staging ? 0.7 : 1,
                }}
              >
                {staging ? 'Staging…' : '📤 Stage SMS'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// CT Bulk Outreach modal
function CTOutreachModal({
  contacts,
  onClose,
  onStage,
}: {
  contacts: Contact[]
  onClose: () => void
  onStage: (city: string, citySlug: string) => Promise<void>
}) {
  const CT_CITIES = [
    { name: 'Hartford', slug: 'hartford' },
    { name: 'New Haven', slug: 'new-haven' },
    { name: 'Stamford', slug: 'stamford' },
    { name: 'Bridgeport', slug: 'bridgeport' },
    { name: 'Waterbury', slug: 'waterbury' },
    { name: 'Norwalk', slug: 'norwalk' },
  ]
  const [selected, setSelected] = useState('hartford')
  const [staging, setStaging] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)

  const handleStage = async () => {
    setStaging(true)
    const city = CT_CITIES.find(c => c.slug === selected)
    if (city) {
      await onStage(city.name, city.slug)
      setResult({ count: contacts.length })
    }
    setStaging(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 12,
          padding: 28, width: 420, maxWidth: '90vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 18 }}>🚀 Start CT Outreach</h3>
        <p style={{ color: '#888', margin: '0 0 20px', fontSize: 13 }}>
          Stage outreach SMS for all {contacts.length} CT fabricator contacts.
        </p>

        {result ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ color: '#86efac', fontWeight: 600 }}>
              {result.count} messages staged for approval
            </div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              Go to Messages → review and send
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 20, background: '#d4a847', color: '#0f1117',
                border: 'none', borderRadius: 8, padding: '8px 24px',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 8 }}>
              City for outreach:
            </label>
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              style={{
                width: '100%', background: '#0f1117', border: '1px solid #2a2a4e',
                borderRadius: 8, color: '#fff', padding: '8px 12px',
                fontSize: 14, marginBottom: 16,
              }}
            >
              {CT_CITIES.map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>

            <div style={{
              background: '#0f1117', border: '1px solid #2a2a4e', borderRadius: 8,
              padding: '10px 12px', marginBottom: 20, fontSize: 12, color: '#aaa',
              lineHeight: 1.5,
            }}>
              <strong style={{ color: '#d4a847' }}>Preview SMS:</strong><br />
              Hi [name] — {CT_CITIES.find(c => c.slug === selected)?.name} CT is available for exclusive countertop leads. One partner only. quarriva.com/partners/{selected}-ct
            </div>

            <div style={{ background: '#0f1117', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 12 }}>Will stage for:</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>{contacts.length} contacts</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, background: '#2a2a4e', color: '#aaa',
                  border: 'none', borderRadius: 8, padding: '10px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStage}
                disabled={staging}
                style={{
                  flex: 2, background: '#d4a847', color: '#0f1117',
                  border: 'none', borderRadius: 8, padding: '10px',
                  fontWeight: 700, cursor: staging ? 'not-allowed' : 'pointer',
                  opacity: staging ? 0.7 : 1,
                }}
              >
                {staging ? 'Staging…' : `📤 Stage ${contacts.length} SMS Messages`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function FabricatorsClient({ partnerStats }: { partnerStats: PartnerStats }) {
  const [data, setData] = useState<FabData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [cityModal, setCityModal] = useState<Contact | null>(null)
  const [ctModal, setCtModal] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/fabricators?state=${stateFilter}&page=${page}`)
      const json = await res.json()

      if (!res.ok) {
        setData({ ...EMPTY_DATA, ghlError: json?.error || 'Unable to load fabricators' })
        showToast('Unable to load fabricators')
        return
      }

      setData({
        ...EMPTY_DATA,
        ...json,
        stateCounts: { ...EMPTY_DATA.stateCounts, ...(json.stateCounts || {}) },
        cityCounts: Array.isArray(json.cityCounts) ? json.cityCounts : [],
        contacts: Array.isArray(json.contacts) ? json.contacts : [],
      })
    } catch (err) {
      console.warn('fabricator CRM load failed:', err)
      setData({ ...EMPTY_DATA, ghlError: 'Unable to load fabricators' })
      showToast('Unable to load fabricators')
    } finally {
      setLoading(false)
    }
  }, [stateFilter, page])

  useEffect(() => { loadData() }, [loadData])

  const handleStageOne = async (city: string, citySlug: string) => {
    if (!cityModal) return
    await fetch('/api/crm/fabricators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stage-outreach',
        contactId: cityModal.id,
        contactName: cityModal.name,
        phone: cityModal.phone,
        city,
        citySlug,
        state: cityModal.state,
      }),
    })
    showToast('✅ Staged for approval')
  }

  const handleStageCT = async (city: string, citySlug: string) => {
    const ctContacts = data?.contacts.filter(c => c.state === 'CT') || []
    await fetch('/api/crm/fabricators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stage-ct-outreach',
        contacts: ctContacts,
        city,
        citySlug,
      }),
    })
    showToast(`✅ ${ctContacts.length} CT messages staged`)
    setCtModal(false)
  }

  const STATE_TABS = ['All', 'CT', 'MA', 'NY', 'FL', 'TX']

  const safeData = data || EMPTY_DATA
  const ctContacts = data?.contacts.filter(c => c.state === 'CT') || []

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>📇 Fabricator Database</h1>
        <p style={{ color: '#888', margin: 0, fontSize: 14 }}>GHL contacts tagged partner-outreach · grouped by state</p>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, background: '#14532d', color: '#86efac',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, zIndex: 50, fontSize: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {data?.ghlError && (
        <div style={{
          background: '#3b2f13',
          border: '1px solid #a16207',
          color: '#fde68a',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13,
          marginBottom: 16,
        }}>
          GHL contacts are temporarily unavailable. Directory city coverage is still shown below.
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '18px 20px', border: '1px solid #2a2a4e' }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Total Contacts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#d4a847' }}>
            {data ? data.total.toLocaleString() : '…'}
          </div>
          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>tagged partner-outreach</div>
        </div>

        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '18px 20px', border: '1px solid #2a2a4e' }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Markets Claimed</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#d4a847' }}>{partnerStats.claimed}</div>
          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>of {partnerStats.claimed + partnerStats.available} total</div>
        </div>

        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '18px 20px', border: '1px solid #2a2a4e' }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Available Cities</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#86efac' }}>{partnerStats.available}</div>
          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>open for partners</div>
        </div>

        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '18px 20px', border: '1px solid #2a2a4e' }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Pending Applications</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: partnerStats.pending > 0 ? '#fde68a' : '#555' }}>
            {partnerStats.pending}
          </div>
          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>need review</div>
        </div>
      </div>

      {/* State Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4e' }}>
          <div style={{ color: '#aaa', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>STATE BREAKDOWN (sample)</div>
          {data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['MA', 'CT', 'NY', 'FL', 'TX', 'Other'].map(st => (
                <div key={st} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 600, width: 50 }}>{st}</span>
                  <div style={{ flex: 1, height: 6, background: '#0f1117', borderRadius: 3, margin: '0 12px' }}>
                    <div style={{
                      width: `${safeData.sampleSize > 0 ? Math.min(100, ((safeData.stateCounts[st] || 0) / safeData.sampleSize) * 100) : 0}%`,
                      height: '100%', background: '#d4a847', borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ color: '#888', fontSize: 13, width: 30, textAlign: 'right' }}>
                    {safeData.stateCounts[st] || 0}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#666' }}>Loading…</div>
          )}
        </div>

        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4e' }}>
          <div style={{ color: '#aaa', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>OUTREACH ACTIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => { setStateFilter('ct'); setPage(1) }}
              style={{
                background: '#0f1117', border: '1px solid #2a2a4e', borderRadius: 8,
                color: '#d4a847', padding: '10px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              📋 Browse CT Contacts
            </button>
            <button
              onClick={() => { setStateFilter('ma'); setPage(1) }}
              style={{
                background: '#0f1117', border: '1px solid #2a2a4e', borderRadius: 8,
                color: '#d4a847', padding: '10px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              📋 Browse MA Contacts
            </button>
            <button
              onClick={() => setCtModal(true)}
              style={{
                background: '#d4a847', border: 'none', borderRadius: 8,
                color: '#0f1117', padding: '10px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              🚀 Start CT Outreach
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4e', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ color: '#aaa', fontSize: 13, fontWeight: 700 }}>CITY COVERAGE</div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
              Active Quarriva directory listings, grouped by city
            </div>
          </div>
          <div style={{ color: '#d4a847', fontWeight: 800, fontSize: 20 }}>
            {data ? data.directoryTotal : '…'}
            <span style={{ color: '#666', fontSize: 12, fontWeight: 500, marginLeft: 6 }}>listings</span>
          </div>
        </div>

        {data?.cityCounts?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {data.cityCounts.map(city => (
              <div
                key={`${city.stateCode}-${city.city}`}
                style={{
                  background: '#0f1117',
                  border: '1px solid #2a2a4e',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {city.city}
                    </div>
                    <div style={{ color: '#666', fontSize: 11 }}>{city.stateCode}</div>
                  </div>
                  <div style={{ color: '#d4a847', fontSize: 22, fontWeight: 800 }}>{city.count}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777', fontSize: 11, marginTop: 8 }}>
                  <span>{city.available} available</span>
                  <span>{city.claimed} claimed</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 13 }}>No city coverage data available.</div>
        )}
      </div>

      {/* State Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATE_TABS.map(t => {
          const val = t === 'All' ? 'all' : t.toLowerCase()
          return (
            <button
              key={t}
              onClick={() => { setStateFilter(val); setPage(1) }}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: stateFilter === val ? '#d4a847' : '#1a1a2e',
                color: stateFilter === val ? '#0f1117' : '#aaa',
              }}
            >
              {t}
              {data && t !== 'All' && ` (${safeData.stateCounts[t] || 0})`}
            </button>
          )
        })}
      </div>

      {/* Contact Table */}
      <div style={{ background: '#1a1a2e', borderRadius: 12, border: '1px solid #2a2a4e', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a4e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#aaa', fontSize: 13, fontWeight: 700 }}>
            CONTACTS
            {data && (
              <span style={{ color: '#666', fontWeight: 400 }}>
                {' '}· showing {safeData.contacts.length} of {safeData.totalFiltered} {stateFilter !== 'all' ? stateFilter.toUpperCase() : ''} contacts (from 100-contact sample)
              </span>
            )}
          </div>
          {data && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  background: '#0f1117', border: '1px solid #2a2a4e', borderRadius: 6,
                  color: page === 1 ? '#444' : '#aaa', padding: '5px 12px', fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Prev
              </button>
              <span style={{ color: '#666', fontSize: 12 }}>Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={safeData.contacts.length < safeData.pageSize}
                style={{
                  background: '#0f1117', border: '1px solid #2a2a4e', borderRadius: 6,
                  color: safeData.contacts.length < safeData.pageSize ? '#444' : '#aaa',
                  padding: '5px 12px', fontSize: 12,
                  cursor: safeData.contacts.length < safeData.pageSize ? 'not-allowed' : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading contacts…</div>
        ) : !data || data.contacts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
            No contacts found{stateFilter !== 'all' ? ` for ${stateFilter.toUpperCase()}` : ''}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a4e', color: '#666', textAlign: 'left' }}>
                  {['Company', 'Name', 'Phone', 'State', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.contacts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #0f1117' }}>
                    <td style={{ padding: '11px 16px', fontWeight: 600, color: '#fff' }}>{c.company}</td>
                    <td style={{ padding: '11px 16px', color: '#aaa' }}>{c.name}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <a href={`tel:${c.phone}`} style={{ color: '#d4a847', textDecoration: 'none' }}>
                        {c.phone}
                      </a>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: c.state === 'CT' ? '#1e3a5f' : c.state === 'MA' ? '#1e3a1e' : c.state === 'Other' ? '#2a2a2a' : '#2a1a3e',
                        color: c.state === 'CT' ? '#93c5fd' : c.state === 'MA' ? '#86efac' : c.state === 'Other' ? '#888' : '#c4b5fd',
                      }}>
                        {c.state}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <button
                        onClick={() => setCityModal(c)}
                        style={{
                          background: 'transparent', border: '1px solid #2a2a4e',
                          borderRadius: 6, color: '#d4a847', padding: '4px 12px',
                          fontSize: 12, cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Send City Link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {cityModal && (
        <CityModal
          contact={cityModal}
          onClose={() => setCityModal(null)}
          onStage={handleStageOne}
        />
      )}

      {ctModal && (
        <CTOutreachModal
          contacts={ctContacts}
          onClose={() => setCtModal(false)}
          onStage={handleStageCT}
        />
      )}
    </div>
  )
}
