import { Metadata } from 'next'
import Link from 'next/link'
import { getPool } from '@/lib/db'
import DirectorySearch from '@/components/directory/DirectorySearch'

export const metadata: Metadata = {
  title: 'Stone Fabricator Directory | Quarriva',
  description: 'Find stone countertop fabricators near you across New England. Browse quartz, granite and marble fabricators in Connecticut, Massachusetts, Rhode Island, New Hampshire, Vermont and Maine.',
}

export const dynamic = 'force-dynamic'

interface Fabricator {
  id: number
  slug: string
  company_name: string
  city: string
  state: string
  state_code: string
  phone: string | null
  msi_confirmed: boolean
  tier: string
  rating: number | null
  review_count: number
}

async function getFabricators(
  page: number,
  state: string,
  service: string,
  msiOnly: boolean,
  search: string
): Promise<{ fabricators: Fabricator[]; total: number }> {
  try {
    const pool = getPool()
    const perPage = 20
    const offset = (page - 1) * perPage

    const conditions: string[] = ["status = 'active'"]
    const params: (string | boolean | number)[] = []
    let paramIdx = 1

    if (state) {
      conditions.push(`state_code = $${paramIdx++}`)
      params.push(state.toUpperCase())
    }
    if (msiOnly) {
      conditions.push(`msi_confirmed = $${paramIdx++}`)
      params.push(true)
    }
    if (service) {
      conditions.push(`$${paramIdx++} = ANY(services)`)
      params.push(service)
    }
    if (search) {
      conditions.push(`(LOWER(company_name) LIKE $${paramIdx++} OR LOWER(city) LIKE $${paramIdx++})`)
      const searchLower = `%${search.toLowerCase()}%`
      params.push(searchLower)
      params.push(searchLower)
      paramIdx++
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM directory_fabricators ${where}`,
      params
    )
    const total = parseInt(countRes.rows[0].count, 10)

    const dataRes = await pool.query(
      `SELECT id, slug, company_name, city, state, state_code, phone, msi_confirmed, tier, rating, review_count
       FROM directory_fabricators
       ${where}
       ORDER BY 
         CASE WHEN tier = 'featured' THEN 0 WHEN tier = 'premium' THEN 1 ELSE 2 END,
         msi_confirmed DESC,
         company_name ASC
       LIMIT ${perPage} OFFSET ${offset}`,
      params
    )

    return { fabricators: dataRes.rows, total }
  } catch {
    return { fabricators: [], total: 0 }
  }
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const page = parseInt((searchParams.page as string) || '1', 10)
  const state = (searchParams.state as string) || ''
  const service = (searchParams.service as string) || ''
  const msiOnly = searchParams.msi === '1'
  const search = (searchParams.q as string) || ''

  const { fabricators, total } = await getFabricators(page, state, service, msiOnly, search)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-[#0f172a] py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find Stone Fabricators Near You
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Browse trusted quartz, granite and marble fabricators across New England
          </p>
          <DirectorySearch defaultQ={search} defaultState={state} defaultService={service} defaultMsi={msiOnly} />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1">
            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-400 text-sm">
                {total > 0 ? (
                  <>Showing <span className="text-white font-medium">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)}</span> of <span className="text-white font-medium">{total}</span> fabricators</>
                ) : (
                  'No fabricators found'
                )}
              </p>
            </div>

            {/* Grid */}
            {fabricators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {fabricators.map((fab) => (
                  <FabricatorCard key={fab.id} fab={fab} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                <p className="text-xl mb-2">No fabricators found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {page > 1 && (
                  <PaginationLink page={page - 1} state={state} service={service} msiOnly={msiOnly} search={search} label="← Prev" />
                )}
                <span className="text-slate-400 text-sm px-4">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <PaginationLink page={page + 1} state={state} service={service} msiOnly={msiOnly} search={search} label="Next →" />
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 sticky top-24">
              <div className="text-amber-400 text-2xl mb-3">🏭</div>
              <h3 className="text-white font-semibold text-lg mb-2">Are you a fabricator?</h3>
              <p className="text-slate-400 text-sm mb-4">
                Search for your shop, open the profile, and claim your Quarriva listing to verify your business and receive lead offers by text.
              </p>
              <Link
                href="/fabricators/register"
                className="block w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-3 rounded-lg text-center transition-colors text-sm"
              >
                Claim Your Listing →
              </Link>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-500 text-xs text-center">
                  Join {total}+ fabricators already listed
                </p>
              </div>
            </div>

            {/* State filter quick links */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mt-4">
              <h4 className="text-slate-300 font-medium text-sm mb-3">Browse by State</h4>
              <div className="flex flex-col gap-1">
                {[
                  { code: 'CT', name: 'Connecticut' },
                  { code: 'MA', name: 'Massachusetts' },
                  { code: 'RI', name: 'Rhode Island' },
                  { code: 'NH', name: 'New Hampshire' },
                  { code: 'VT', name: 'Vermont' },
                  { code: 'ME', name: 'Maine' },
                ].map(s => (
                  <Link
                    key={s.code}
                    href={`/directory?state=${s.code}`}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      state === s.code
                        ? 'bg-amber-500/20 text-amber-400 font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function FabricatorCard({ fab }: { fab: Fabricator }) {
  const isFeatured = fab.tier === 'featured' || fab.tier === 'premium'

  return (
    <div className={`rounded-xl p-5 flex flex-col gap-3 transition-all hover:scale-[1.01] ${
      isFeatured
        ? 'bg-amber-950/30 border-2 border-amber-500/60 shadow-amber-900/20 shadow-lg'
        : 'bg-slate-800/50 border border-slate-700/60'
    }`}>
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {isFeatured && (
          <span className="text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full">
            ⭐ Featured
          </span>
        )}
        {fab.msi_confirmed && (
          <span className="text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full">
            MSI Certified
          </span>
        )}
      </div>

      {/* Company name */}
      <h3 className="text-white font-semibold text-base leading-tight">{fab.company_name}</h3>

      {/* Location */}
      <p className="text-slate-400 text-sm">
        📍 {fab.city}, {fab.state_code}
      </p>

      {/* Rating */}
      {fab.rating && fab.review_count > 0 ? (
        <div className="flex items-center gap-1.5 text-sm">
          <StarRating rating={Number(fab.rating)} />
          <span className="text-slate-400">({fab.review_count})</span>
        </div>
      ) : (
        <p className="text-slate-600 text-xs">No reviews yet</p>
      )}

      {/* CTA */}
      <Link
        href={`/directory/${fab.slug}`}
        className={`mt-auto block text-center text-sm font-medium py-2 px-4 rounded-lg transition-colors ${
          isFeatured
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
            : 'bg-slate-700 hover:bg-slate-600 text-white'
        }`}
      >
        View Profile →
      </Link>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= Math.round(rating) ? 'text-amber-400' : 'text-slate-600'}
        >
          ★
        </span>
      ))}
      <span className="text-slate-300 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

function PaginationLink({
  page, state, service, msiOnly, search, label
}: {
  page: number
  state: string
  service: string
  msiOnly: boolean
  search: string
  label: string
}) {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (state) params.set('state', state)
  if (service) params.set('service', service)
  if (msiOnly) params.set('msi', '1')
  if (search) params.set('q', search)
  const qs = params.toString()

  return (
    <Link
      href={`/directory${qs ? `?${qs}` : ''}`}
      className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
    >
      {label}
    </Link>
  )
}
