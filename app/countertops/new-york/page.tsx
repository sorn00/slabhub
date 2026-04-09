import type { Metadata } from 'next'
import townsData from '@/public/data/towns.json'

type TownEntry = { slug: string; name: string; county: string; pop: number }

const towns = townsData as Record<string, TownEntry[]>
const nyTowns = towns['new-york']

const serviceArea = 'Quarriva Partner Network — Coming to your area soon'

export const metadata: Metadata = {
  title: 'Countertops in New York | Quarriva',
  description:
    'Browse quartz, granite and marble countertop services across New York. Find local fabricators in NYC, Brooklyn, Queens, Westchester, Nassau, Suffolk and beyond.',
  keywords:
    'countertops New York, quartz countertops NYC, granite countertops New York, kitchen countertops NY, stone fabricators New York',
}

function groupByCounty(townList: TownEntry[]): Record<string, TownEntry[]> {
  return townList.reduce(
    (acc, town) => {
      if (!acc[town.county]) acc[town.county] = []
      acc[town.county].push(town)
      return acc
    },
    {} as Record<string, TownEntry[]>
  )
}

export default function NewYorkPage() {
  const byCounty = groupByCounty(nyTowns)
  const counties = Object.keys(byCounty).sort()

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
          Service Area
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 'bold',
            margin: '0 0 16px',
          }}
        >
          Countertops in New York
        </h1>
        <p
          style={{
            color: '#94a3b8',
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto 12px',
          }}
        >
          Premium quartz, granite &amp; marble countertops serving {nyTowns.length}{' '}
          cities and towns across New York.
        </p>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
          {serviceArea}
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

      {/* Towns by county */}
      <div
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
      >
        <h2
          style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}
        >
          Find Countertops Near You
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '40px' }}>
          Select your city or town to browse available stone options and request a
          free quote.
        </p>

        {counties.map((county) => (
          <div key={county} style={{ marginBottom: '48px' }}>
            <h3
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#d4a847',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid #2a2a3e',
              }}
            >
              {county} County
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              {byCounty[county].map((town) => (
                <a
                  key={town.slug}
                  href={`/countertops/new-york/${town.slug}`}
                  style={{
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    textDecoration: 'none',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                    {town.name}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>
                    Pop. {town.pop.toLocaleString()}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div
          style={{
            marginTop: '40px',
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}
          >
            Ready to Get Started?
          </h2>
          <p
            style={{
              color: '#94a3b8',
              marginBottom: '24px',
              maxWidth: '500px',
              margin: '0 auto 24px',
            }}
          >
            Browse 200+ quartz and granite slabs. Save favorites. Request a free
            quote from New York fabricators coming to your area.
          </p>
          <a
            href="/stones"
            style={{
              background: '#d4a847',
              color: '#1a1a2e',
              padding: '14px 32px',
              borderRadius: '8px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Browse Stone Catalog →
          </a>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <a
            href="/countertops"
            style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}
          >
            ← All service areas
          </a>
        </div>
      </div>
    </div>
  )
}
