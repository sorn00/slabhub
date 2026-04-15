import { Metadata } from 'next'
import Link from 'next/link'
import { getPool } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Stone Countertop Guides & Resources | Quarriva Blog',
  description: 'Expert guides on quartz vs granite, buying tips, installation guides, and New England countertop resources from Quarriva.',
  keywords: 'countertop guide, quartz vs granite, stone buying guide, New England countertops, kitchen renovation',
  openGraph: {
    title: 'Quarriva Blog — Stone Countertop Resources',
    description: 'Expert guides, comparisons, and buying tips for New England homeowners.',
    type: 'website',
  },
}

interface Article {
  id: number
  slug: string
  title: string
  meta_description: string | null
  state: string | null
  city: string | null
  category: string | null
  created_at: string
  published_at: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  state_guide: '🗺️ State Guide',
  city_guide: '📍 City Guide',
  comparison: '⚖️ Comparison',
  buyer_guide: '🛒 Buyer Guide',
}

async function getArticles(): Promise<Article[]> {
  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT id, slug, title, meta_description, state, city, category, created_at, published_at
       FROM seo_articles
       WHERE status = 'published'
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT 50`
    )
    return result.rows as Article[]
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const articles = await getArticles()

  const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)))

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-b border-slate-700 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Stone Countertop Guides & Resources
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Expert advice for New England homeowners — stone comparisons, buying guides, local market insights, and everything you need to choose the perfect countertop.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">Content coming soon. Check back shortly!</p>
            <Link href="/stones" className="mt-4 inline-block text-amber-400 hover:text-amber-300 underline">
              Browse Stone Catalog →
            </Link>
          </div>
        ) : (
          <>
            {/* Category filter pills */}
            {categories.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-8">
                {categories.map(cat => cat && (
                  <span key={cat} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-full">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {articles.map(article => (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group block bg-slate-800/30 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {article.category && (
                        <span className="text-xs text-amber-400 mb-2 block">
                          {CATEGORY_LABELS[article.category] || article.category}
                        </span>
                      )}
                      <h2 className="text-lg font-bold group-hover:text-amber-400 transition-colors mb-2 leading-tight">
                        {article.title}
                      </h2>
                      {article.meta_description && (
                        <p className="text-slate-400 text-sm leading-relaxed">{article.meta_description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                        {article.state && <span>📍 {article.state}</span>}
                        {article.city && <span>• {article.city}</span>}
                        {article.published_at && (
                          <span>• {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-amber-400 text-xl mt-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to Find Your Perfect Stone?</h2>
          <p className="text-slate-300 mb-5 text-sm">Browse 200+ premium MSI surfaces and get free quotes from local New England fabricators.</p>
          <Link
            href="/quote"
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-3 rounded-xl transition-colors inline-block"
          >
            Get a Free Quote
          </Link>
        </div>
      </div>
    </div>
  )
}
