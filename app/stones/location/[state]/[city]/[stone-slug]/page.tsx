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
  accentColor?: string
  style?: string
  priceRange?: number
  finish?: string[]
  description?: string
  imageUrl?: string
  imageLargeUrl?: string
  thumbnailUrl?: string
  closeupUrl?: string
  slabUrl?: string
  thickness?: string[]
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

const PRICE_RANGES: Record<number, string> = {
  1: '$30–$50/sqft installed',
  2: '$50–$75/sqft installed',
  3: '$75–$110/sqft installed',
  4: '$110–$160+/sqft installed',
}

function toTitleCase(str: string) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface PageProps {
  params: { state: string; city: string; 'stone-slug': string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stateName = STATE_NAMES[params.state]
  const stoneSlug = params['stone-slug']
  const stone = catalog.find(s => s.id === stoneSlug)

  if (!stateName || !stone) return { title: 'Not Found | Quarriva' }

  const cityName = toTitleCase(params.city)

  return {
    title: `${stone.name} Countertops in ${cityName}, ${stateName} | Quarriva`,
    description: `Get ${stone.name} ${stone.material} countertops installed in ${cityName}, ${stateName}. Free quotes from certified local fabricators. ${stone.priceRange ? PRICE_RANGES[stone.priceRange] : 'Competitive pricing available'}.`,
    keywords: `${stone.name} countertops ${cityName}, ${stone.name} ${stateName}, ${stone.material} countertops ${cityName}, ${stone.name} installation`,
    openGraph: {
      title: `${stone.name} Countertops in ${cityName} | Quarriva`,
      description: `${stone.description || `Premium ${stone.material} surface available in ${cityName}, ${stateName}.`}`,
      images: stone.imageUrl ? [{ url: stone.imageUrl, alt: stone.name }] : [],
      type: 'website',
    },
  }
}

export async function generateStaticParams() {
  const params: { state: string; city: string; 'stone-slug': string }[] = []
  const stateCities: Record<string, string[]> = {
    massachusetts: ['boston', 'worcester', 'cambridge'],
    connecticut: ['stamford', 'hartford', 'bridgeport'],
  }
  for (const [state, cities] of Object.entries(stateCities)) {
    for (const city of cities) {
      for (const stone of catalog.slice(0, 20)) {
        params.push({ state, city, 'stone-slug': stone.id })
      }
    }
  }
  return params
}

export default function StoneStateCityPage({ params }: PageProps) {
  const stateName = STATE_NAMES[params.state]
  const stoneSlug = params['stone-slug']
  const stone = catalog.find(s => s.id === stoneSlug)

  if (!stateName || !stone) notFound()

  const cityName = toTitleCase(params.city)
  const priceLabel = stone.priceRange ? PRICE_RANGES[stone.priceRange] : 'Contact for pricing'

  const relatedStones = catalog
    .filter(s => s.material === stone.material && s.id !== stone.id)
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Breadcrumb */}
      <div className="bg-slate-900/50 border-b border-slate-800 py-3">
        <div className="max-w-6xl mx-auto px-4 text-sm text-slate-400 flex items-center gap-2 flex-wrap">
          <Link href={`/${params.state}`} className="hover:text-amber-400 transition-colors">{stateName}</Link>
          <span>›</span>
          <Link href={`/stones/${params.state}/${params.city}`} className="hover:text-amber-400 transition-colors">{cityName}</Link>
          <span>›</span>
          <span className="text-slate-300">{stone.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image */}
          <div>
            {stone.imageLargeUrl || stone.imageUrl ? (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-800">
                <Image
                  src={stone.imageLargeUrl || stone.imageUrl!}
                  alt={`${stone.name} countertops in ${cityName}, ${stateName}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-2xl bg-slate-800 flex items-center justify-center">
                <span className="text-slate-500 text-4xl">◆</span>
              </div>
            )}
            {/* Additional images */}
            {(stone.closeupUrl || stone.slabUrl) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {stone.closeupUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800">
                    <Image src={stone.closeupUrl} alt={`${stone.name} closeup`} fill className="object-cover" sizes="25vw" />
                  </div>
                )}
                {stone.slabUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800">
                    <Image src={stone.slabUrl} alt={`${stone.name} slab`} fill className="object-cover" sizes="25vw" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="inline-block bg-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full mb-3 capitalize">
              {stone.material}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{stone.name}</h1>
            <p className="text-slate-400 mb-6">Countertops in {cityName}, {stateName}</p>

            {stone.description && (
              <p className="text-slate-300 mb-6 leading-relaxed">{stone.description}</p>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {stone.primaryColor && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Primary Color</span>
                  <span className="text-sm font-medium capitalize">{stone.primaryColor}</span>
                </div>
              )}
              {stone.accentColor && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Accent Color</span>
                  <span className="text-sm font-medium capitalize">{stone.accentColor}</span>
                </div>
              )}
              {stone.finish && stone.finish.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Finish</span>
                  <span className="text-sm font-medium capitalize">{stone.finish.join(', ')}</span>
                </div>
              )}
              {stone.thickness && stone.thickness.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 block">Thickness</span>
                  <span className="text-sm font-medium">{stone.thickness.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Estimated Price Range</span>
                  <span className="text-lg font-bold text-amber-400">{priceLabel}</span>
                </div>
                <span className="text-xs text-slate-500">Includes fabrication & installation</span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href={`/quote?stone=${stone.id}&city=${params.city}&state=${params.state}`}
              className="block w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 rounded-xl text-center text-lg transition-colors mb-3"
            >
              Get {stone.name} Installed in {cityName}
            </Link>
            <Link
              href={`/stones/${params.state}/${params.city}`}
              className="block w-full text-center text-slate-400 hover:text-slate-300 text-sm py-2 transition-colors"
            >
              ← View all stones in {cityName}
            </Link>
          </div>
        </div>

        {/* SEO Content Block */}
        <div className="mt-16 prose prose-invert prose-amber max-w-none">
          <h2 className="text-2xl font-bold mb-4">{stone.name} Countertops in {cityName}, {stateName}</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            {stone.name} is one of the most sought-after {stone.material} surfaces available in {cityName}, {stateName}.
            {stone.description ? ` ${stone.description}` : ''} Available through Quarriva&apos;s network of certified fabricators
            serving {cityName} and all of {stateName}, {stone.name} brings premium quality to kitchens, bathrooms, and commercial spaces.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            Homeowners in {cityName} appreciate {stone.name} for its{' '}
            {stone.material === 'quartz' ? 'durability, non-porous surface, and low maintenance requirements' :
             stone.material === 'granite' ? 'natural beauty, unique veining, and heat resistance' :
             stone.material === 'marble' ? 'timeless elegance and classic aesthetic appeal' :
             'stunning natural character and exceptional hardness'}.
            {stone.finish && stone.finish.length > 0
              ? ` Available in ${stone.finish.join(' and ')} finish${stone.finish.length > 1 ? 'es' : ''}.`
              : ''}
          </p>
          <p className="text-slate-300 leading-relaxed">
            Ready to bring {stone.name} to your {cityName} home? Quarriva connects you with the best stone fabricators
            in {stateName} — get multiple quotes, compare prices, and choose the installer that fits your project and budget.
          </p>
        </div>

        {/* Related stones */}
        {relatedStones.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-6">Similar {stone.material} Surfaces in {cityName}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedStones.map(s => (
                <Link
                  key={s.id}
                  href={`/stones/${params.state}/${params.city}/${s.id}`}
                  className="group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all"
                >
                  {s.thumbnailUrl && (
                    <div className="aspect-video relative overflow-hidden">
                      <Image src={s.thumbnailUrl} alt={s.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="25vw" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium group-hover:text-amber-400 transition-colors">{s.name}</p>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">{s.material}</p>
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
