import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPool } from '@/lib/db'
import QuoteRequestForm from '@/components/directory/QuoteRequestForm'
import ReviewSection from '@/components/directory/ReviewSection'

interface Fabricator {
  id: number
  slug: string
  company_name: string
  city: string
  state: string
  state_code: string
  phone: string | null
  website: string | null
  email: string | null
  address: string | null
  services: string[] | null
  brands: string[] | null
  msi_confirmed: boolean
  tier: string
  claimed: boolean
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  years_in_business: number | null
  rating: number | null
  review_count: number
}

interface Review {
  id: number
  reviewer_name: string
  rating: number
  review_text: string | null
  project_type: string | null
  created_at: string
}

async function getFabricator(slug: string): Promise<Fabricator | null> {
  try {
    const pool = getPool()
    const res = await pool.query(
      `SELECT * FROM directory_fabricators WHERE slug = $1 AND status = 'active' LIMIT 1`,
      [slug]
    )
    return res.rows[0] || null
  } catch {
    return null
  }
}

async function getReviews(fabricatorId: number): Promise<Review[]> {
  try {
    const pool = getPool()
    const res = await pool.query(
      `SELECT id, reviewer_name, rating, review_text, project_type, created_at
       FROM fabricator_reviews
       WHERE fabricator_id = $1
       ORDER BY created_at DESC`,
      [fabricatorId]
    )
    return res.rows
  } catch {
    return []
  }
}

async function getSimilar(stateCode: string, excludeId: number): Promise<Fabricator[]> {
  try {
    const pool = getPool()
    const res = await pool.query(
      `SELECT id, slug, company_name, city, state_code, msi_confirmed, tier, rating, review_count
       FROM directory_fabricators
       WHERE state_code = $1 AND id != $2 AND status = 'active'
       ORDER BY CASE WHEN tier='featured' THEN 0 WHEN tier='premium' THEN 1 ELSE 2 END, msi_confirmed DESC, RANDOM()
       LIMIT 3`,
      [stateCode, excludeId]
    )
    return res.rows
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  try {
    const pool = getPool()
    const res = await pool.query('SELECT slug FROM directory_fabricators WHERE status = $1', ['active'])
    return res.rows.map((r: { slug: string }) => ({ slug: r.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const fab = await getFabricator(params.slug)
  if (!fab) {
    return { title: 'Fabricator Not Found | Quarriva' }
  }
  return {
    title: `${fab.company_name} — ${fab.city}, ${fab.state} Stone Fabricator | Quarriva`,
    description: `Find ${fab.company_name} in ${fab.city}, ${fab.state}. Quartz, granite and marble countertop fabrication. Get a free quote through Quarriva.`,
    openGraph: {
      title: `${fab.company_name} — Stone Fabricator in ${fab.city}, ${fab.state}`,
      description: `Quartz, granite and marble countertop fabrication in ${fab.city}, ${fab.state}.`,
    },
  }
}

export default async function FabricatorProfilePage({
  params,
}: {
  params: { slug: string }
}) {
  const fab = await getFabricator(params.slug)
  if (!fab) notFound()

  const [reviews, similar] = await Promise.all([
    getReviews(fab.id),
    getSimilar(fab.state_code, fab.id),
  ])

  const isFeatured = fab.tier === 'featured' || fab.tier === 'premium'
  const services = fab.services ?? []
  const brands = fab.brands ?? []

  const defaultDescription = `${fab.company_name} is a stone countertop fabricator located in ${fab.city}, ${fab.state}. They specialize in quartz, granite and marble countertop fabrication and installation.`

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Cover / Header */}
      <section className={`border-b ${isFeatured ? 'border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-[#0f172a]' : 'border-slate-800 bg-gradient-to-b from-slate-900 to-[#0f172a]'} py-10 px-4`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4">
            {/* Logo placeholder */}
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 ${isFeatured ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-700 text-slate-400'}`}>
              {fab.company_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{fab.company_name}</h1>
                {isFeatured && (
                  <span className="text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full">
                    ⭐ Featured
                  </span>
                )}
                {fab.msi_confirmed && (
                  <span className="text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-full">
                    ✓ MSI Certified
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-base mb-3">
                📍 {fab.city}, {fab.state}
              </p>
              <div className="flex flex-wrap gap-3">
                {fab.phone && (
                  <a
                    href={`tel:${fab.phone}`}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-amber-400 transition-colors"
                  >
                    📞 {fab.phone}
                  </a>
                )}
                {fab.website && (
                  <a
                    href={fab.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-amber-400 transition-colors"
                  >
                    🌐 Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-4">
            <Link href="/directory" className="hover:text-slate-300 transition-colors">Directory</Link>
            <span>›</span>
            <Link href={`/directory?state=${fab.state_code}`} className="hover:text-slate-300 transition-colors">{fab.state}</Link>
            <span>›</span>
            <span className="text-slate-400">{fab.company_name}</span>
          </div>
        </div>
      </section>

      {/* Unclaimed banner */}
      {!fab.claimed && (
        <div className="bg-slate-800/60 border-b border-slate-700/50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-slate-400 text-sm">
              <span className="text-amber-400 font-medium">Is this your business?</span> Claim this listing to update your info and receive leads directly.
            </p>
            <Link
              href={`/directory/${fab.slug}/claim`}
              className="shrink-0 text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Claim Listing →
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* About */}
            <section className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">About {fab.company_name}</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                {fab.description || defaultDescription}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {fab.years_in_business && (
                  <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                    <p className="text-amber-400 font-bold text-xl">{fab.years_in_business}+</p>
                    <p className="text-slate-400 text-xs mt-0.5">Years in Business</p>
                  </div>
                )}
                {services.length > 0 && (
                  <div className="bg-slate-700/40 rounded-lg p-3">
                    <p className="text-slate-400 text-xs font-medium mb-2">Services</p>
                    <div className="flex flex-wrap gap-1">
                      {services.map(s => (
                        <span key={s} className="text-xs bg-slate-600/60 text-slate-300 px-2 py-0.5 rounded-full capitalize">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {brands.length > 0 && (
                  <div className="bg-slate-700/40 rounded-lg p-3">
                    <p className="text-slate-400 text-xs font-medium mb-2">Brands</p>
                    <div className="flex flex-wrap gap-1">
                      {brands.map(b => (
                        <span key={b} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{b}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Reviews */}
            <ReviewSection fabricatorId={fab.id} fabricatorSlug={fab.slug} reviews={reviews} rating={fab.rating ? Number(fab.rating) : null} reviewCount={fab.review_count} />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Quote form */}
            <QuoteRequestForm fabricatorId={fab.id} fabricatorName={fab.company_name} city={fab.city} />

            {/* Similar fabricators */}
            {similar.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Similar Fabricators in {fab.state}</h3>
                <div className="flex flex-col gap-3">
                  {similar.map(s => (
                    <Link
                      key={s.id}
                      href={`/directory/${s.slug}`}
                      className="flex items-center justify-between p-3 bg-slate-700/40 hover:bg-slate-700/70 rounded-lg transition-colors group"
                    >
                      <div>
                        <p className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors">{s.company_name}</p>
                        <p className="text-slate-500 text-xs">{s.city}</p>
                      </div>
                      {s.msi_confirmed && (
                        <span className="text-xs text-blue-400 shrink-0">MSI ✓</span>
                      )}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/directory?state=${fab.state_code}`}
                  className="block text-center text-xs text-slate-500 hover:text-amber-400 transition-colors mt-3"
                >
                  View all in {fab.state} →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
