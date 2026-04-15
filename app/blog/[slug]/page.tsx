import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPool } from '@/lib/db'

interface Article {
  id: number
  slug: string
  title: string
  meta_description: string | null
  content: string | null
  keywords: string | null
  state: string | null
  city: string | null
  stone_type: string | null
  category: string | null
  status: string
  created_at: string
  published_at: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  state_guide: '🗺️ State Guide',
  city_guide: '📍 City Guide',
  comparison: '⚖️ Comparison',
  buyer_guide: '🛒 Buyer Guide',
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT * FROM seo_articles WHERE slug = $1 AND status = 'published' LIMIT 1`,
      [slug]
    )
    return result.rows[0] as Article || null
  } catch {
    return null
  }
}

async function getRelatedArticles(article: Article): Promise<Article[]> {
  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT id, slug, title, meta_description, category, state
       FROM seo_articles
       WHERE status = 'published' AND slug != $1 AND (state = $2 OR category = $3)
       ORDER BY published_at DESC NULLS LAST
       LIMIT 3`,
      [article.slug, article.state, article.category]
    )
    return result.rows as Article[]
  } catch {
    return []
  }
}

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getArticle(params.slug)
  if (!article) return { title: 'Not Found | Quarriva' }

  return {
    title: `${article.title} | Quarriva`,
    description: article.meta_description || undefined,
    keywords: article.keywords || undefined,
    openGraph: {
      title: article.title,
      description: article.meta_description || undefined,
      type: 'article',
      publishedTime: article.published_at || undefined,
    },
  }
}

function renderContent(content: string) {
  // Split paragraphs on double newlines, render as paragraphs
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim())
  return paragraphs.map((para, i) => {
    // Handle markdown-style headers
    if (para.startsWith('## ')) {
      return <h2 key={i} className="text-xl font-bold mt-8 mb-3 text-white">{para.replace('## ', '')}</h2>
    }
    if (para.startsWith('# ')) {
      return <h2 key={i} className="text-2xl font-bold mt-8 mb-3 text-white">{para.replace('# ', '')}</h2>
    }
    if (para.startsWith('### ')) {
      return <h3 key={i} className="text-lg font-semibold mt-6 mb-2 text-slate-200">{para.replace('### ', '')}</h3>
    }
    // Handle bullet lists
    if (para.includes('\n- ') || para.startsWith('- ')) {
      const items = para.split('\n').filter(l => l.startsWith('- '))
      return (
        <ul key={i} className="list-disc list-inside space-y-1 my-4 text-slate-300">
          {items.map((item, j) => <li key={j}>{item.replace('- ', '')}</li>)}
        </ul>
      )
    }
    return <p key={i} className="text-slate-300 leading-relaxed mb-4">{para}</p>
  })
}

export default async function BlogArticlePage({ params }: PageProps) {
  const article = await getArticle(params.slug)
  if (!article) notFound()

  const related = await getRelatedArticles(article)

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-b border-slate-700 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href="/blog" className="hover:text-amber-400 transition-colors">Blog</Link>
            {article.category && (
              <>
                <span>›</span>
                <span className="text-amber-400">{CATEGORY_LABELS[article.category] || article.category}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{article.title}</h1>
          {article.meta_description && (
            <p className="text-slate-400 text-lg leading-relaxed">{article.meta_description}</p>
          )}
          <div className="flex items-center gap-4 mt-5 text-xs text-slate-500">
            {publishedDate && <span>Published {publishedDate}</span>}
            {article.state && <span>📍 {article.state}</span>}
            {article.city && <span>• {article.city}</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        {article.content ? (
          <article className="prose-content">
            {renderContent(article.content)}
          </article>
        ) : (
          <p className="text-slate-400">Content not available.</p>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to Get Started?</h2>
          <p className="text-slate-300 mb-5 text-sm">Browse 200+ premium stone surfaces and get free quotes from certified local fabricators.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/stones"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Browse Stones
            </Link>
            <Link
              href="/quote"
              className="border border-amber-500 text-amber-400 hover:bg-amber-500/10 font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Get Free Quote
            </Link>
          </div>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold mb-4">Related Articles</h2>
            <div className="space-y-3">
              {related.map(r => (
                <Link
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group flex items-start gap-3 bg-slate-800/30 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-all"
                >
                  <div className="flex-1">
                    {r.category && (
                      <span className="text-xs text-amber-400 block mb-1">{CATEGORY_LABELS[r.category] || r.category}</span>
                    )}
                    <p className="font-medium text-sm group-hover:text-amber-400 transition-colors">{r.title}</p>
                    {r.meta_description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.meta_description}</p>
                    )}
                  </div>
                  <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-800">
          <Link href="/blog" className="text-slate-400 hover:text-amber-400 transition-colors text-sm">
            ← Back to all articles
          </Link>
        </div>
      </div>
    </div>
  )
}
