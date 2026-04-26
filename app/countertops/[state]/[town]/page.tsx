import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import townsData from '@/public/data/towns.json'
import catalogData from '@/public/data/msi-catalog.json'

type TownEntry = { slug: string; name: string; county: string; pop: number }
type CatalogEntry = { id: string; name: string; material: string; imageUrl?: string; [key: string]: unknown }

const towns = townsData as Record<string, TownEntry[]>
const catalog = catalogData as CatalogEntry[]

export async function generateStaticParams() {
  const params: { state: string; town: string }[] = []
  for (const [state, townList] of Object.entries(towns)) {
    for (const town of townList) {
      params.push({ state, town: town.slug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: { state: string; town: string }
}): Promise<Metadata> {
  const { state, town: townSlug } = params
  const stateData = towns[state]
  if (!stateData) return {}
  const townData = stateData.find((t) => t.slug === townSlug)
  if (!townData) return {}
  const stateName = state === 'massachusetts' ? 'Massachusetts' : 'Connecticut'

  return {
    title: `Quartz & Granite Countertops in ${townData.name}, ${stateName} | Quarriva`,
    description: `Find premium quartz and granite countertops in ${townData.name}, ${stateName}. Browse 200+ stone options, get free quotes from local fabricators. Fast installation.`,
    keywords: [
      `countertops ${townData.name}`,
      `quartz countertops ${townData.name} ${stateName}`,
      `granite countertops ${townData.name}`,
      `kitchen countertops ${townData.name}`,
      `marble countertops ${townData.name}`,
      `countertop installation ${townData.name}`,
      `${townData.county} county countertops`,
      `stone fabricator ${townData.name}`,
    ].join(', '),
  }
}

export default function TownPage({
  params,
}: {
  params: { state: string; town: string }
}) {
  const { state, town: townSlug } = params
  const stateData = towns[state]
  if (!stateData) notFound()
  const townData = stateData.find((t) => t.slug === townSlug)
  if (!townData) notFound()

  const stateName = state === 'massachusetts' ? 'Massachusetts' : 'Connecticut'
  const stateAbbr = state === 'massachusetts' ? 'MA' : 'CT'

  // Get featured stones (rotate by town name hash)
  const hash = townData.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const quartz = catalog.filter(
    (s) => s.material === 'quartz' && s.imageUrl && s.imageUrl.length > 30
  )
  const featuredStones = quartz.slice(hash % Math.max(1, quartz.length - 6), (hash % Math.max(1, quartz.length - 6)) + 6)

  const serviceArea =
    state === 'massachusetts'
      ? 'Quarriva Partner Network'
      : 'Quarriva Partner Network'

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
          {townData.county} County · {stateName}
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 'bold',
            margin: '0 0 16px',
          }}
        >
          Countertops in {townData.name}, {stateAbbr}
        </h1>
        <p
          style={{
            color: '#94a3b8',
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto 32px',
          }}
        >
          Browse premium quartz, granite &amp; marble. Get quotes from local fabricators in{' '}
          {townData.name} and surrounding areas.
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

      {/* Featured Stones */}
      <div
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
      >
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Popular Choices in {townData.name}
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
          Top-selling quartz and granite countertops for {townData.name} homeowners
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {featuredStones.map((stone, i) => (
            <a
              key={i}
              href={`/stones/detail/${stone.slug || stone.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: '#1a1a2e',
                  border: '1px solid #2a2a3e',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    aspectRatio: '4/3',
                    overflow: 'hidden',
                    background: '#0f1117',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stone.imageUrl}
                    alt={stone.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: '16px' }}>
                  <h3
                    style={{
                      margin: '0 0 4px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                    }}
                  >
                    {stone.name}
                  </h3>
                  <p
                    style={{
                      margin: '0 0 12px',
                      color: '#94a3b8',
                      fontSize: '13px',
                      textTransform: 'capitalize',
                    }}
                  >
                    {stone.material}
                  </p>
                  <span
                    style={{
                      background: '#d4a847',
                      color: '#1a1a2e',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    Get Quote
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Quote CTA */}
        <div
          style={{
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '12px' }}
          >
            Get a Free Quote for {townData.name}
          </h2>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '16px',
              maxWidth: '500px',
              margin: '0 auto 32px',
            }}
          >
            Serving {townData.name} and all of {townData.county} County. Fast
            turnaround, professional installation.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="/stones"
              style={{
                background: '#d4a847',
                color: '#1a1a2e',
                padding: '14px 28px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Browse Stones &amp; Request Quote
            </a>
            <a
              href="/register"
              style={{
                background: 'transparent',
                color: '#d4a847',
                padding: '14px 28px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textDecoration: 'none',
                border: '1px solid #d4a847',
              }}
            >
              Create Account
            </a>
          </div>
          <p
            style={{ color: '#555', fontSize: '13px', marginTop: '24px' }}
          >
            Served by: {serviceArea}
          </p>
        </div>

        {/* Local SEO content */}
        <div
          style={{
            marginTop: '60px',
            padding: '40px',
            background: '#1a1a2e',
            borderRadius: '12px',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px',
            }}
          >
            Countertop Installation in {townData.name}, {stateName}
          </h2>
          <p
            style={{
              color: '#94a3b8',
              lineHeight: '1.8',
              marginBottom: '16px',
            }}
          >
            Quarriva connects {townData.name} homeowners with premium stone
            countertops and professional installation. Whether you&apos;re
            renovating your kitchen, updating bathroom vanities, or adding a
            fireplace surround, we have hundreds of quartz, granite, and marble
            options to match your style and budget.
          </p>
          <p
            style={{
              color: '#94a3b8',
              lineHeight: '1.8',
              marginBottom: '16px',
            }}
          >
            Our {townData.county} County service area covers {townData.name} and
            surrounding communities. Browse our full catalog of MSI premium
            surfaces, save your favorites, and request a free quote — all online,
            no appointment needed.
          </p>
          <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
            Average project timeline: template within 2-3 days of cabinet
            installation, countertops installed 7-10 days after template. We work
            around your schedule.
          </p>
        </div>

        {/* Nearby towns breadcrumb */}
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <p style={{ color: '#555', fontSize: '13px' }}>
            <a
              href={`/countertops/${state}`}
              style={{ color: '#94a3b8', textDecoration: 'none' }}
            >
              ← All {stateName} locations
            </a>
            {' · '}
            <a
              href="/countertops"
              style={{ color: '#94a3b8', textDecoration: 'none' }}
            >
              Service areas
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
