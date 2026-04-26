import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPool } from '@/lib/db'
import ClaimForm from '@/components/directory/ClaimForm'

interface Fabricator {
  id: number
  slug: string
  company_name: string
  city: string
  state: string
  state_code: string
  phone: string | null
  claimed: boolean
}

async function getFabricator(slug: string): Promise<Fabricator | null> {
  try {
    const pool = getPool()
    const res = await pool.query(
      `SELECT id, slug, company_name, city, state, state_code, phone, claimed FROM directory_fabricators WHERE slug = $1 AND status = 'active' LIMIT 1`,
      [slug]
    )
    return res.rows[0] || null
  } catch {
    return null
  }
}

export async function generateStaticParams() {
  try {
    const pool = getPool()
    const res = await pool.query('SELECT slug FROM directory_fabricators WHERE status = $1 AND claimed = false', ['active'])
    return res.rows.map((r: { slug: string }) => ({ slug: r.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const fab = await getFabricator(params.slug)
  if (!fab) return { title: 'Claim Listing | Quarriva' }
  return {
    title: `Claim ${fab.company_name} on Quarriva`,
    description: `Claim your Quarriva listing for ${fab.company_name} in ${fab.city}, ${fab.state} to verify the business and receive homeowner lead offers by text.`,
  }
}

export default async function ClaimPage({ params }: { params: { slug: string } }) {
  const fab = await getFabricator(params.slug)
  if (!fab) notFound()

  if (fab.claimed) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-white text-2xl font-bold mb-2">Already Claimed</h1>
          <p className="text-slate-400 mb-6">This listing has already been claimed by its owner.</p>
          <Link href={`/directory/${fab.slug}`} className="text-amber-400 hover:text-amber-300 transition-colors">
            ← Back to {fab.company_name}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] py-16 px-4">
      <div className="max-w-lg mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/directory" className="hover:text-slate-300 transition-colors">Directory</Link>
          <span>›</span>
          <Link href={`/directory/${fab.slug}`} className="hover:text-slate-300 transition-colors">{fab.company_name}</Link>
          <span>›</span>
          <span className="text-slate-400">Claim</span>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-3xl mb-3">🏭</div>
            <h1 className="text-white text-2xl font-bold mb-2">Claim Your Quarriva Listing</h1>
            <p className="text-slate-400 text-sm">
              <span className="text-amber-400 font-medium">{fab.company_name}</span> in {fab.city}, {fab.state}
            </p>
          </div>

          <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
            <h3 className="text-white text-sm font-semibold mb-2">What happens after you claim:</h3>
            <ul className="text-slate-400 text-sm flex flex-col gap-1.5">
              <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">✓</span> We verify you are authorized to manage this listing</li>
              <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">✓</span> Update your business info, photos, and description</li>
              <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">✓</span> Set up a card for accepted lead claims, with no monthly retainer</li>
              <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">✓</span> Get text offers for $200 projects with measurements ready for quote and $125 standard appointment leads</li>
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-amber-100 text-sm leading-relaxed">
              Claiming your listing is free. Card setup happens after this claim step and is only used when you accept a future lead offer.
            </p>
          </div>

          {fab.phone && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-300 text-sm">
                <span className="font-medium">Verification:</span> We&apos;ll call the number on file ({fab.phone}) to verify your ownership.
              </p>
            </div>
          )}

          <ClaimForm fabricatorId={fab.id} fabricatorSlug={fab.slug} fabricatorName={fab.company_name} />
        </div>
      </div>
    </div>
  )
}
