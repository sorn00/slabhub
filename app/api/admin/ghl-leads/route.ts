import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch from public static file (updated on each batch run)
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://quarriva.com'
    const res = await fetch(`${base}/data/ghl-batch-latest.json`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ contacts: [], batchId: null })
    const batch = await res.json()
    return NextResponse.json({ contacts: batch.contacts || [], batchId: batch.batchId, createdAt: batch.createdAt, total: batch.totalContacts })
  } catch {
    return NextResponse.json({ error: 'Failed to load batch' }, { status: 500 })
  }
}
