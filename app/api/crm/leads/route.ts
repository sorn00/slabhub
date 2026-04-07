import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getLeadsWithStage, getStageCounts } from '@/lib/ghl-db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')?.toLowerCase()
    const type = searchParams.get('type')

    if (type === 'stagecounts') {
      const counts = getStageCounts()
      return NextResponse.json(counts)
    }

    let leads = getLeadsWithStage()

    if (stage) {
      leads = leads.filter(l => l.stage_name === stage)
    }

    if (search) {
      leads = leads.filter(l =>
        l.name?.toLowerCase().includes(search) ||
        l.phone?.toLowerCase().includes(search) ||
        l.email?.toLowerCase().includes(search)
      )
    }

    return NextResponse.json(leads)
  } catch (err) {
    console.error('GHL leads error:', err)
    return NextResponse.json({ error: 'Failed to read GHL database' }, { status: 500 })
  }
}
