import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StoneDetailClient from './StoneDetailClient'
import { query } from '@/lib/db'

interface PageProps {
  params: { slug: string }
}

async function getStone(slug: string) {
  try {
    const rows = await query(`
      SELECT
        id AS stone_id,
        id,
        slug,
        name,
        name AS stone_name,
        brand,
        material,
        primary_color AS "primaryColor",
        style,
        price_per_sf AS "priceRange",
        finish_options AS finish,
        description,
        image_url AS "imageUrl",
        closeup_url AS "closeupUrl",
        slab_url AS "slabUrl",
        thickness,
        tags,
        seo_title AS "seoTitle",
        seo_meta AS "seoMetaDescription",
        seo_keywords AS "seoKeywords",
        in_stock AS "inStock",
        stock_sqft AS "stockSqft",
        stock_slabs AS "stockSlabs",
        availability,
        is_promo AS "isPromo",
        promo_price_per_sf,
        promo_label AS "promoLabel",
        promo_expires AS "promoExpires",
        series
      FROM stones
      WHERE slug = $1
      LIMIT 1
    `, [slug])
    return rows[0] || null
  } catch {
    return null
  }
}

async function getRelatedStones(stone: Record<string, unknown>) {
  try {
    const rows = await query(`
      SELECT
        id, slug, name, brand, material,
        primary_color AS "primaryColor",
        price_per_sf AS "priceRange",
        image_url AS "imageUrl",
        style, tags
      FROM stones
      WHERE slug != $1
        AND (primary_color = $2 OR material = $3)
        AND image_url IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 4
    `, [stone.slug, stone.primaryColor, stone.material])
    return rows
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stone = await getStone(params.slug)
  if (!stone) return { title: 'Stone Not Found | Quarriva' }

  const title = stone.seoTitle || `${stone.name} Countertops | Quarriva`
  const description = stone.seoMetaDescription || stone.description || `Explore ${stone.name} ${stone.material} countertops on Quarriva.`

  return {
    title,
    description,
    keywords: Array.isArray(stone.seoKeywords) ? stone.seoKeywords.join(', ') : stone.seoKeywords,
    openGraph: {
      title: String(stone.seoTitle || title),
      description: String(stone.seoMetaDescription || description),
      images: stone.imageUrl ? [{ url: String(stone.imageUrl), alt: String(stone.name) }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: String(title),
      description: String(description),
      images: stone.imageUrl ? [String(stone.imageUrl)] : [],
    },
  }
}

export default async function StoneDetailPage({ params }: PageProps) {
  const stone = await getStone(params.slug)
  if (!stone) notFound()

  const related = await getRelatedStones(stone)

  return <StoneDetailClient stone={stone} related={related} />
}
