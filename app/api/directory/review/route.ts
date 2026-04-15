import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fabricatorId, reviewerName, rating, reviewText, projectType } = body as {
      fabricatorId: number
      reviewerName: string
      rating: number
      reviewText?: string
      projectType?: string
    }

    if (!fabricatorId || !reviewerName || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const pool = getPool()

    await pool.query(`
      INSERT INTO fabricator_reviews (fabricator_id, reviewer_name, rating, review_text, project_type, verified)
      VALUES ($1, $2, $3, $4, $5, false)
    `, [fabricatorId, reviewerName, rating, reviewText || null, projectType || null])

    // Recalculate rating on fabricator
    await pool.query(`
      UPDATE directory_fabricators
      SET 
        rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM fabricator_reviews WHERE fabricator_id = $1 AND verified = true),
        review_count = (SELECT COUNT(*) FROM fabricator_reviews WHERE fabricator_id = $1),
        updated_at = NOW()
      WHERE id = $1
    `, [fabricatorId])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Review error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
