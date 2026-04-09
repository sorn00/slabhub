import type { Metadata } from 'next'
import townsData from '@/public/data/towns.json'

type TownEntry = { slug: string; name: string; county: string; pop: number }

const towns = townsData as Record<string, TownEntry[]>

export const metadata: Metadata = {
  title: 'Countertop Service Areas | Quarriva',
  description:
    'Quarriva serves homeowners across Massachusetts, Connecticut, New York, Florida, and Texas with premium quartz, granite, and marble countertops. Find your town and get a free quote today.',
  keywords:
    'countertops Massachusetts Connecticut New York Florida Texas, quartz granite countertops, stone countertops, local countertop fabricator',
}

const states = [
  {
    key: 'massachusetts',
    name: 'Massachusetts',
    abbr: 'MA',
    description: 'Serving Greater Boston, MetroWest, South Shore, Cape Cod, and all of Massachusetts.',
    highlight: 'Arts Marble & Granite — Framingham, MA',
    towns: towns.massachusetts,
  },
  {
    key: 'connecticut',
    name: 'Connecticut',
    abbr: 'CT',
    description: 'Serving Fairfield County, Hartford, New Haven, and all of Connecticut.',
    highlight: 'Quarriva Partner Network',
    towns: towns.connecticut,
  },
  {
    key: 'new-york',
    name: 'New York',
    abbr: 'NY',
    description: 'Serving NYC, Westchester, Nassau, Suffolk, and all of New York.',
    highlight: 'Quarriva Partner Network — Coming soon',
    towns: towns['new-york'],
  },
  {
    key: 'florida',
    name: 'Florida',
    abbr: 'FL',
    description: 'Serving Miami, Orlando, Tampa, Jacksonville, and all of Florida.',
    highlight: 'Quarriva Partner Network — Coming soon',
    towns: towns['florida'],
  },
  {
    key: 'texas',
    name: 'Texas',
    abbr: 'TX',
    description: 'Serving Houston, Dallas, Austin, San Antonio, and all of Texas.',
    highlight: 'Quarriva Partner Network — Coming soon',
    towns: towns['texas'],
  },
]

export default function CountertopsHubPage() {
  const totalTowns = states.reduce((a, s) => a + s.towns.length, 0)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f1117',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f1117 100%)',
          padding: '60px 20px',
          textAlign: 'center',
          borderBottom: '1px solid #2a2a3e',
        }}
      >
        <p
          style={{
            color: '#d4a847',
            fontSize: '14px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Service Areas
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 'bold',
            margin: '0 0 16px',
          }}
        >
          Countertops Near You
        </h1>
        <p
          style={{
            color: '#94a3b8',
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto 16px',
          }}
        >
          Quarriva connects homeowners across New England with premium stone
          countertops and professional installation.
        </p>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
          Serving {totalTowns}+ cities and towns across 5 states
        </p>
        <a
          href="/stones"
          style={{
            background: '#d4a847',
            color: '#1a1a2e',
            padding: '14px 32px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '16px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Browse All Stones →
        </a>
      </div>

      {/* State cards */}
      <div
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
      >
        <h2
          style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}
        >
          Select Your State
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '40px' }}>
          Choose your state to find countertop services in your city or town.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
            gap: '32px',
            marginBottom: '60px',
          }}
        >
          {states.map((state) => (
            <a
              key={state.key}
              href={`/countertops/${state.key}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: '#1a1a2e',
                  border: '1px solid #2a2a3e',
                  borderRadius: '16px',
                  padding: '40px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      background: '#d4a847',
                      color: '#1a1a2e',
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      flexShrink: 0,
                    }}
                  >
                    {state.abbr}
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: 'bold',
                      }}
                    >
                      {state.name}
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                      {state.towns.length} cities &amp; towns
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    color: '#94a3b8',
                    lineHeight: '1.6',
                    marginBottom: '24px',
                  }}
                >
                  {state.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '24px',
                  }}
                >
                  {state.towns.slice(0, 8).map((t) => (
                    <span
                      key={t.slug}
                      style={{
                        background: '#0f1117',
                        border: '1px solid #2a2a3e',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '13px',
                        color: '#94a3b8',
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                  <span
                    style={{
                      background: '#0f1117',
                      border: '1px solid #2a2a3e',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '13px',
                      color: '#64748b',
                    }}
                  >
                    +{state.towns.length - 8} more
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#d4a847', fontWeight: 'bold' }}>
                    View All {state.name} Towns →
                  </span>
                  <span style={{ color: '#555', fontSize: '12px' }}>
                    {state.highlight}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Why Quarriva */}
        <div
          style={{
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: '16px',
            padding: '48px',
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            Why Quarriva?
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '32px',
            }}
          >
            {[
              {
                icon: '◆',
                title: '200+ Stone Options',
                desc: 'MSI quartz, granite, and marble in every style and price range.',
              },
              {
                icon: '📍',
                title: 'Local Fabricators',
                desc: 'Matched with fabricators who serve your specific town.',
              },
              {
                icon: '💬',
                title: 'Free Quotes',
                desc: 'Browse, save favorites, request quotes — no pressure.',
              },
              {
                icon: '⚡',
                title: 'Fast Turnaround',
                desc: 'Template to install in under 2 weeks in most areas.',
              },
            ].map((item) => (
              <div key={item.title} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '32px',
                    marginBottom: '12px',
                    color: '#d4a847',
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
