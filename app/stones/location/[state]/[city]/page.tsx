import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import catalogData from '@/public/data/msi-catalog.json'

interface Stone {
  id: string
  name: string
  material: string
  primaryColor?: string
  description?: string
  imageUrl?: string
  thumbnailUrl?: string
  priceRange?: number
  tags?: string[]
}

const catalog = catalogData as Stone[]

const STATE_NAMES: Record<string, string> = {
  connecticut: 'Connecticut',
  massachusetts: 'Massachusetts',
  'rhode-island': 'Rhode Island',
  'new-hampshire': 'New Hampshire',
  vermont: 'Vermont',
  maine: 'Maine',
}

function toTitleCase(str: string) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface PageProps {
  params: { state: string; city: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stateName = STATE_NAMES[params.state]
  if (!stateName) return { title: 'Not Found | Quarriva' }

  const cityName = toTitleCase(params.city)
  const count = catalog.length

  return {
    title: `${cityName}, ${stateName} Quartz & Granite Countertops | Quarriva`,
    description: `Browse ${count}+ premium quartz and granite countertops available in ${cityName}, ${stateName}. Compare MSI surfaces, get free quotes from local fabricators.`,
    keywords: `${cityName} countertops, ${cityName} quartz, ${cityName} granite, ${stateName} stone countertops, kitchen countertops ${cityName}`,
    openGraph: {
      title: `${cityName} Countertops | Quarriva`,
      description: `${count}+ premium stone surfaces available near ${cityName}, ${stateName}.`,
      type: 'website',
    },
  }
}

export async function generateStaticParams() {
  const params: { state: string; city: string }[] = []
  // Generate for major NE cities — DB-driven at runtime, but need params for static generation
  const cities: Record<string, string[]> = {
    connecticut: ['bridgeport', 'stamford', 'hartford', 'new-haven', 'waterbury', 'norwalk', 'danbury', 'greenwich'],
    massachusetts: ['boston', 'worcester', 'springfield', 'cambridge', 'lowell', 'brockton', 'quincy', 'newton'],
    'rhode-island': ['providence', 'cranston', 'warwick', 'pawtucket', 'east-providence', 'woonsocket', 'newport'],
    'new-hampshire': ['manchester', 'nashua', 'concord', 'derry', 'dover', 'rochester', 'salem', 'portsmouth'],
    vermont: ['burlington', 'south-burlington', 'rutland', 'barre', 'montpelier'],
    maine: ['portland', 'lewiston', 'bangor', 'south-portland', 'auburn', 'biddeford'],
  }
  for (const [state, cityList] of Object.entries(cities)) {
    for (const city of cityList) {
      params.push({ state, city })
    }
  }
  return params
}

export default function CityStatePage({ params }: PageProps) {
  const stateName = STATE_NAMES[params.state]
  if (!stateName) notFound()

  const cityName = toTitleCase(params.city)
  const stones = catalog.slice(0, 12)

  const priceLabels: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-b border-slate-700 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-amber-400 text-sm mb-3 flex items-center gap-2">
            <Link href={`/${params.state}`} className="hover:underline">{stateName}</Link>
            <span>›</span>
            <span>{cityName}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Quartz & Granite Countertops in {cityName}, {stateName}
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mb-8">
            Browse {catalog.length}+ premium stone surfaces available near {cityName}. Compare quartz, granite, marble, and quartzite from MSI Surfaces — the leading stone brand in New England.
          </p>
          <Link
            href="/quote"
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-8 py-3 rounded-lg transition-colors text-lg inline-block"
          >
            Get a Free Quote in {cityName}
          </Link>
        </div>
      </div>

      {/* Stones Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-2">Popular Stone Surfaces in {cityName}</h2>
        <p className="text-slate-400 mb-8">
          All {catalog.length} MSI surfaces are available through Quarriva&apos;s network of certified fabricators in {cityName} and surrounding {stateName} communities.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {stones.map(stone => (
            <Link
              key={stone.id}
              href={`/stones/${params.state}/${params.city}/${stone.id}`}
              className="group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10"
            >
              {stone.imageUrl && (
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={stone.imageUrl}
                    alt={`${stone.name} countertops in ${cityName}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              )}
              <div className="p-3">
                <h3 className="font-semibold text-sm text-white group-hover:text-amber-400 transition-colors leading-tight">
                  {stone.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 capitalize">{stone.material}</p>
                {stone.priceRange && (
                  <p className="text-xs text-amber-400 mt-1">{priceLabels[stone.priceRange] || ''}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/stones"
            className="text-amber-400 hover:text-amber-300 font-medium underline"
          >
            View all {catalog.length} stone surfaces →
          </Link>
        </div>

        {/* Local SEO content */}
        <div className="mt-16 grid md:grid-cols-2 gap-8">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-3">Why {cityName} Homeowners Choose Quarriva</h2>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Access to 200+ premium MSI stone surfaces</li>
              <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Certified local fabricators in {cityName} and {stateName}</li>
              <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Free instant quotes — no obligation</li>
              <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Compare pricing across multiple fabricators</li>
              <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> Quartz, granite, marble, quartzite & more</li>
            </ul>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-3">Stone Types Available in {cityName}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-amber-400 font-medium">Quartz Countertops</span>
                <p className="text-slate-400 mt-1">Engineered stone — durable, non-porous, low maintenance. Perfect for {cityName} kitchens.</p>
              </div>
              <div>
                <span className="text-amber-400 font-medium">Granite Countertops</span>
                <p className="text-slate-400 mt-1">Natural stone with unique patterns. Adds value and character to any {stateName} home.</p>
              </div>
              <div>
                <span className="text-amber-400 font-medium">Marble & Quartzite</span>
                <p className="text-slate-400 mt-1">Luxury surfaces for premium kitchens and bathrooms in {cityName}.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Transform Your {cityName} Home?</h2>
          <p className="text-slate-300 mb-6">Get a free, no-obligation quote from certified fabricators near {cityName}, {stateName}.</p>
          <Link
            href="/quote"
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 py-4 rounded-xl transition-colors text-lg inline-block"
          >
            Get a Free Quote in {cityName}
          </Link>
        </div>
      </div>
    </div>
  )
}
