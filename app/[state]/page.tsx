import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPool } from '@/lib/db'
import catalogData from '@/public/data/msi-catalog.json'

interface Stone {
  id: string
  name: string
  material: string
  imageUrl?: string
  thumbnailUrl?: string
  priceRange?: number
}

interface City {
  city: string
  state: string
  state_code: string
  population: number
}

const catalog = catalogData as Stone[]

const STATE_SLUGS: Record<string, string> = {
  connecticut: 'Connecticut',
  massachusetts: 'Massachusetts',
  'rhode-island': 'Rhode Island',
  'new-hampshire': 'New Hampshire',
  vermont: 'Vermont',
  maine: 'Maine',
}

const STATE_FACTS: Record<string, { capital: string; tagline: string; cities: string }> = {
  connecticut: {
    capital: 'Hartford',
    tagline: 'Premium stone countertops for Connecticut homeowners — from Greenwich to Bridgeport and everywhere in between.',
    cities: 'Bridgeport, Stamford, Hartford, New Haven, Norwalk, Danbury',
  },
  massachusetts: {
    capital: 'Boston',
    tagline: 'Discover the best quartz and granite countertops in Massachusetts — serving Boston, Worcester, Cambridge and the entire Commonwealth.',
    cities: 'Boston, Worcester, Springfield, Cambridge, Lowell, Brockton',
  },
  'rhode-island': {
    capital: 'Providence',
    tagline: 'Rhode Island\'s premier stone marketplace — premium countertops for Providence, Cranston, Warwick and beyond.',
    cities: 'Providence, Cranston, Warwick, Pawtucket, Newport',
  },
  'new-hampshire': {
    capital: 'Concord',
    tagline: 'Beautiful countertops for New Hampshire homes — serving Manchester, Nashua, Concord and the Granite State.',
    cities: 'Manchester, Nashua, Concord, Derry, Dover, Portsmouth',
  },
  vermont: {
    capital: 'Montpelier',
    tagline: 'Quality stone countertops for Vermont — Burlington, Rutland, Barre and all of the Green Mountain State.',
    cities: 'Burlington, South Burlington, Rutland, Barre, Montpelier',
  },
  maine: {
    capital: 'Augusta',
    tagline: 'Maine\'s trusted stone marketplace — serving Portland, Lewiston, Bangor and communities across the Pine Tree State.',
    cities: 'Portland, Lewiston, Bangor, South Portland, Auburn',
  },
}

interface PageProps {
  params: { state: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stateName = STATE_SLUGS[params.state]
  if (!stateName) return { title: 'Not Found | Quarriva' }

  const facts = STATE_FACTS[params.state]

  return {
    title: `Quartz & Granite Countertops in ${stateName} | Quarriva`,
    description: facts?.tagline || `Browse 200+ premium quartz, granite and marble countertops available across ${stateName}. Get free quotes from local fabricators.`,
    keywords: `${stateName} countertops, quartz countertops ${stateName}, granite countertops ${stateName}, stone fabricators ${stateName}, kitchen countertops ${stateName}`,
    openGraph: {
      title: `${stateName} Stone Countertops | Quarriva`,
      description: `Find your perfect countertop surface in ${stateName}.`,
      type: 'website',
    },
  }
}

export function generateStaticParams() {
  return Object.keys(STATE_SLUGS).map(state => ({ state }))
}

async function getCities(stateSlug: string): Promise<City[]> {
  const stateName = STATE_SLUGS[stateSlug]
  if (!stateName) return []
  try {
    const pool = getPool()
    const result = await pool.query(
      'SELECT city, state, state_code, population FROM seo_cities WHERE state = $1 ORDER BY population DESC NULLS LAST',
      [stateName]
    )
    return result.rows as City[]
  } catch {
    return []
  }
}

function cityToSlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')
}

export default async function StatePage({ params }: PageProps) {
  const stateName = STATE_SLUGS[params.state]
  if (!stateName) notFound()

  const facts = STATE_FACTS[params.state]
  const cities = await getCities(params.state)
  const popularStones = catalog.slice(0, 6)

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-b border-slate-700 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-amber-400 text-sm mb-3">
            <Link href="/stones" className="hover:underline">Stones</Link> › {stateName}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Quartz & Granite Countertops in {stateName}
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mb-8">
            {facts?.tagline || `Browse 200+ premium stone surfaces available across ${stateName}. Get free quotes from certified local fabricators.`}
          </p>
          <Link
            href="/quote"
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-8 py-3 rounded-lg transition-colors text-lg inline-block"
          >
            Get a Free Quote in {stateName}
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Popular Stones */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Popular Stone Surfaces in {stateName}</h2>
          <p className="text-slate-400 mb-8">Top-selling MSI quartz and granite surfaces in New England homes.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularStones.map(stone => (
              <Link
                key={stone.id}
                href={`/stones`}
                className="group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all text-center"
              >
                {stone.thumbnailUrl && (
                  <div className="aspect-square relative overflow-hidden">
                    <Image
                      src={stone.thumbnailUrl}
                      alt={stone.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 33vw, 16vw"
                    />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium group-hover:text-amber-400 transition-colors leading-tight">{stone.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{stone.material}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cities Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Browse by City in {stateName}</h2>
          <p className="text-slate-400 mb-8">
            Find stone countertops and local fabricators in every major {stateName} city.
          </p>
          {cities.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {cities.map(c => (
                <Link
                  key={c.city}
                  href={`/stones/${params.state}/${cityToSlug(c.city)}`}
                  className="group bg-slate-800/30 border border-slate-700 rounded-xl px-4 py-3 hover:border-amber-500/50 hover:bg-slate-800/60 transition-all"
                >
                  <p className="font-medium text-sm group-hover:text-amber-400 transition-colors">{c.city}</p>
                  {c.population && (
                    <p className="text-xs text-slate-500 mt-0.5">{c.population.toLocaleString()} residents</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(facts?.cities || '').split(', ').map(city => (
                <Link
                  key={city}
                  href={`/stones/${params.state}/${cityToSlug(city)}`}
                  className="group bg-slate-800/30 border border-slate-700 rounded-xl px-4 py-3 hover:border-amber-500/50 hover:bg-slate-800/60 transition-all"
                >
                  <p className="font-medium text-sm group-hover:text-amber-400 transition-colors">{city}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Why Quarriva */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Why {stateName} Homeowners Choose Quarriva</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <div className="text-3xl mb-3">🏠</div>
              <h3 className="font-bold mb-2">200+ Premium Surfaces</h3>
              <p className="text-slate-400 text-sm">Access to the full MSI Surfaces catalog — quartz, granite, marble, quartzite and more.</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-bold mb-2">Competitive Quotes</h3>
              <p className="text-slate-400 text-sm">Get multiple quotes from certified fabricators across {stateName} — find the best price for your project.</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-bold mb-2">Fast & Easy Process</h3>
              <p className="text-slate-400 text-sm">Browse, select, and get quoted in minutes. No showroom visit required to get started.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Start Your {stateName} Countertop Project Today</h2>
          <p className="text-slate-300 mb-6">Browse 200+ stones, pick your favorites, and get free quotes from certified {stateName} fabricators.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/stones"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Browse All Stones
            </Link>
            <Link
              href="/quote"
              className="border border-amber-500 text-amber-400 hover:bg-amber-500/10 font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Get Free Quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
