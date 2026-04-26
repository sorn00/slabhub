import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET — all users with saved stone selections + their quote requests
export async function GET() {
  const rows = await query(`
    SELECT
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      COALESCE(u.phone, '') as user_phone,
      json_agg(
        json_build_object(
          'stone_id', qs.stone_id,
          'stone_name', qs.stone_name,
          'image_url', qs.image_url,
          'added_at', qs.added_at,
          'status', qs.status
        ) ORDER BY qs.added_at DESC
      ) FILTER (WHERE qs.stone_id IS NOT NULL) as saved_stones,
      MAX(qs.added_at) as last_activity
    FROM users u
    LEFT JOIN quote_selections qs ON qs.user_id = u.id::text
    GROUP BY u.id, u.name, u.email, u.phone
    HAVING MAX(qs.added_at) IS NOT NULL
    ORDER BY last_activity DESC
  `, [])
  return NextResponse.json({ leads: rows })
}
