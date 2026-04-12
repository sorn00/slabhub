import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import catalogData from '@/public/data/msi-catalog.json'
import StoneDetailClient from './StoneDetailClient'
import { query } from '@/lib/db'

interface Stone {
  id: string
  name: string
  material: string
  primaryColor?: string
  accentColor?: string
  style?: string
  priceRange: number
  finish?: string[]
  description?: string
  imageUrl?: string
  imageLargeUrl?: string
  thumbnailUrl?: string
  closeupUrl?: string
  slabUrl?: string
  thickness?: string[]
  tags?: string[]
  seoTitle?: string
  seoMetaDescription?: string
  seoKeywords?: string[]
}

const catalog = catalogData as Stone[]

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stone = catalog.find(s => s.id === params.id)
  if (!stone) {
    return {
      title: 'Stone Not Found | Quarriva',
    }
  }

  const title = stone.seoTitle || `${stone.name} Countertops | Arts Marble & Granite`
  const description = stone.seoMetaDescription || stone.description || `Explore ${stone.name} ${stone.material} countertops from Arts Marble & Granite.`

  return {
    title,
    description,
    keywords: stone.seoKeywords?.join(', '),
    openGraph: {
      title: stone.seoTitle || title,
      description: stone.seoMetaDescription || description,
      images: stone.imageUrl ? [{ url: stone.imageUrl, alt: stone.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: stone.imageUrl ? [stone.imageUrl] : [],
    },
  }
}

export async function generateStaticParams() {
  return catalog.map(stone => ({ id: stone.id }))
}

function getRelatedStones(stone: Stone, allStones: Stone[]): Stone[] {
  const others = allStones.filter(s => s.id !== stone.id)

  // Primary: same color family
  const sameColor = others.filter(s => s.primaryColor === stone.primaryColor)
  if (sameColor.length >= 4) {
    return sameColor.slice(0, 4)
  }

  // Fallback: same material
  const sameMaterial = others.filter(s => s.material === stone.material)
  const seen = new Set<string>()
  const combined: Stone[] = []
  for (const s of [...sameColor, ...sameMaterial]) {
    if (!seen.has(s.id)) { seen.add(s.id); combined.push(s) }
  }
  return combined.slice(0, 4)
}

export default async function StoneDetailPage({ params }: PageProps) {
  const stone = catalog.find(s => s.id === params.id)
  if (!stone) {
    notFound()
  }

  // Fetch live stock data from DB
  let inStock = false
  let stockSqft = 0
  let stockSlabs = 0
  try {
    const rows = await query(
      `SELECT in_stock, stock_sqft, stock_slabs FROM stone_prices WHERE stone_id = $1 LIMIT 1`,
      [stone!.id]
    )
    if (rows.length > 0) {
      inStock = rows[0].in_stock || false
      stockSqft = rows[0].stock_sqft || 0
      stockSlabs = rows[0].stock_slabs || 0
    }
  } catch { /* ignore */ }

  const related = getRelatedStones(stone!, catalog)
  const stoneWithStock = { ...stone!, inStock, stockSqft, stockSlabs }

  return <StoneDetailClient stone={stoneWithStock} related={related} />
}
