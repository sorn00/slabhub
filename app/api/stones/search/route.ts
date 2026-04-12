import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db-postgres'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const material = searchParams.get('material') || null
  const color = searchParams.get('color') || null
  const finish = searchParams.get('finish') || null
  const style = searchParams.get('style') || null
  const priceMin = searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : null
  const priceMax = searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : null
  const q = searchParams.get('q') || null
  const inStock = searchParams.get('inStock') === 'true'
  const promoOnly = searchParams.get('promo') === 'true'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const sort = searchParams.get('sort') || 'popular'
  const pageSize = 25
  const offset = (page - 1) * pageSize

  const pool = getPool()

  // Build dynamic where clauses
  const conditions: string[] = []
  const params: (string | number | null)[] = []

  if (material) {
    params.push(material.toLowerCase())
    conditions.push(`LOWER(material) = $${params.length}`)
  }

  if (color) {
    params.push(color)
    conditions.push(`primary_color = $${params.length}`)
  }

  if (finish) {
    params.push(finish)
    conditions.push(`$${params.length} = ANY(finish)`)
  }

  if (style) {
    params.push(style.toLowerCase())
    conditions.push(`LOWER(style) = $${params.length}`)
  }

  if (priceMin !== null) {
    params.push(priceMin)
    conditions.push(`retail_sqft >= $${params.length}`)
  }

  if (priceMax !== null) {
    params.push(priceMax)
    conditions.push(`retail_sqft <= $${params.length}`)
  }

  if (inStock) {
    conditions.push(`in_stock = true`)
  }

  if (promoOnly) {
    conditions.push(`is_promo = true`)
  }

  if (q) {
    params.push(q)
    conditions.push(`stone_name ILIKE '%' || $${params.length} || '%'`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Build ORDER BY
  let orderBy = 'stone_name ASC'
  if (sort === 'price-asc') {
    orderBy = 'retail_sqft ASC NULLS LAST, stone_name ASC'
  } else if (sort === 'price-desc') {
    orderBy = 'retail_sqft DESC NULLS LAST, stone_name ASC'
  } else if (sort === 'newest') {
    orderBy = 'id DESC'
  }

  const countParams = [...params]
  const countQuery = `SELECT COUNT(*) FROM stone_prices ${whereClause}`

  const dataParams = [...params, pageSize, offset]
  const dataQuery = `
    SELECT 
      id,
      stone_id,
      stone_name,
      material,
      retail_sqft,
      dealer_cost_sqft,
      primary_color,
      style,
      finish,
      tags,
      image_url,
      closeup_url,
      slab_url,
      description,
      thickness,
      in_stock,
      stock_sqft,
      stock_slabs,
      is_promo,
      promo_price_per_slab,
      promo_qty
    FROM stone_prices
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `

  try {
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ])

    const total = parseInt(countResult.rows[0].count, 10)

    return NextResponse.json({
      stones: dataResult.rows,
      total,
      page,
      pages: Math.ceil(total / pageSize),
      pageSize,
    })
  } catch (err) {
    console.error('Stone search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
