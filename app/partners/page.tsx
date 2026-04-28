import Link from 'next/link'
import { getPool } from '@/lib/db-postgres'

interface Market {
  city_slug: string
  city_name: string
  state: string
  status: string
  leads_last_30d: number
  partner_name: string | null
}

async function getMarkets(): Promise<Market[]> {
  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT city_slug, city_name, state, status, leads_last_30d, partner_name
       FROM partner_markets
       WHERE state IN ('MA', 'CT')
       ORDER BY state, city_name`
    )
    return result.rows
  } catch {
    return []
  }
}

export const revalidate = 60

export default async function PartnersPage() {
  const markets = await getMarkets()
  const available = markets.filter(m => m.status === 'available').length
  const claimed = markets.filter(m => m.status === 'claimed').length

  const maMarkets = markets.filter(m => m.state === 'MA')
  const ctMarkets = markets.filter(m => m.state === 'CT')

  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#d4a847', color: '#0f1117', fontSize: 12, fontWeight: 700, letterSpacing: 2, padding: '6px 16px', borderRadius: 4, marginBottom: 24, textTransform: 'uppercase' }}>
          Exclusive Partner Network
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: -1 }}>
          GROW YOUR<br />
          <span style={{ color: '#d4a847' }}>FABRICATION BUSINESS</span>
        </h1>
        <p style={{ fontSize: 20, color: '#aaa', maxWidth: 560, margin: '0 auto 16px', lineHeight: 1.6 }}>
          Exclusive countertop leads in your city.<br />
          <strong style={{ color: '#fff' }}>One partner per market. First come, first served.</strong>
        </p>

        {/* Urgency bar */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', margin: '32px 0', flexWrap: 'wrap' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 12, padding: '16px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#4ade80' }}>{available}</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Markets Available</div>
          </div>
          <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 12, padding: '16px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>{claimed}</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Already Claimed</div>
          </div>
          <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 12, padding: '16px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#d4a847' }}>$200</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Per Qualified Lead</div>
          </div>
        </div>

        <Link
          href="#markets"
          style={{
            display: 'inline-block',
            background: '#d4a847',
            color: '#0f1117',
            fontWeight: 700,
            fontSize: 16,
            padding: '16px 40px',
            borderRadius: 8,
            textDecoration: 'none',
            letterSpacing: 0.5,
          }}
        >
          Browse Available Markets →
        </Link>
      </section>

      {/* How it works */}
      <section style={{ background: '#1a1a2e', padding: '60px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 48, color: '#d4a847' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32 }}>
            {[
              { num: '1', title: 'Claim Your Listing', desc: 'Verify your business and confirm the service areas where you want lead offers.' },
              { num: '2', title: 'We Deliver Leads', desc: 'We send qualified homeowners actively looking for countertop installation.' },
              { num: '3', title: 'Pay Per Lead', desc: '$200 for projects with measurements ready for quote. $125 for standard appointment leads. Zero upfront cost. No monthly fees.' },
              { num: '4', title: 'No Contracts', desc: 'Cancel anytime. Accepted leads are exclusive to your shop.' },
            ].map(step => (
              <div key={step.num} style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#d4a847', color: '#0f1117', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#999', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets Grid */}
      <section id="markets" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Beta Lead Areas</h2>
        <p style={{ color: '#888', marginBottom: 40 }}>Claim your listing and confirm the areas where you want lead offers.</p>

        {/* Massachusetts */}
        <div style={{ marginBottom: 48 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#d4a847', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            🏔️ Massachusetts
          </h3>
          <MarketGrid markets={maMarkets} />
        </div>

        {/* Connecticut */}
        <div style={{ marginBottom: 48 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#d4a847', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            🌳 Connecticut
          </h3>
          <MarketGrid markets={ctMarkets} />
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link
            href="/partners/markets"
            style={{ color: '#d4a847', textDecoration: 'underline', fontSize: 15 }}
          >
            View all markets including NY, FL, TX →
          </Link>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ background: '#d4a847', padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ color: '#0f1117', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
          Start Receiving Exclusive Lead Offers
        </h2>
        <p style={{ color: '#3a2d0a', fontSize: 16, marginBottom: 24 }}>
          Claim your listing and we will send your first real countertop client opportunity free, on us.
        </p>
        <Link
          href="#markets"
          style={{ display: 'inline-block', background: '#0f1117', color: '#d4a847', fontWeight: 700, padding: '14px 36px', borderRadius: 8, textDecoration: 'none', fontSize: 15 }}
        >
          Claim Your Listing Now →
        </Link>
      </section>

    </div>
  )
}

function MarketGrid({ markets }: { markets: Market[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {markets.map(m => (
        <Link
          key={m.city_slug}
          href={`/partners/${m.city_slug}`}
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            background: m.status === 'claimed' ? '#1a0f0f' : '#0d1f0d',
            border: `1px solid ${m.status === 'claimed' ? '#7f1d1d' : '#14532d'}`,
            borderRadius: 10,
            padding: '16px',
            cursor: 'pointer',
            transition: 'transform 0.1s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{m.city_name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                background: m.status === 'claimed' ? '#7f1d1d' : '#14532d',
                color: m.status === 'claimed' ? '#fca5a5' : '#86efac',
              }}>
                {m.status === 'claimed' ? '🔴 TAKEN' : '🟢 OPEN'}
              </span>
            </div>
            {m.status === 'available' ? (
              <div style={{ fontSize: 12, color: '#888' }}>{m.leads_last_30d} leads / 30 days</div>
            ) : (
              <div style={{ fontSize: 12, color: '#666' }}>{m.partner_name}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
