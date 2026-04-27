import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPool, run } from '@/lib/db'
import { randomUUID } from 'crypto'

const GHL_TOKEN = process.env.GHL_TOKEN || ''
const GHL_LOC = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'

// Area code → state mapping
const AREA_CODE_STATE: Record<string, string> = {}
const MA_CODES = [508, 781, 978, 617, 339, 351, 774, 857]
const CT_CODES = [203, 860, 959]
const NY_CODES = [212, 332, 347, 516, 518, 585, 607, 631, 646, 716, 718, 845, 914, 917, 929]
const FL_CODES = [239, 305, 321, 352, 386, 407, 561, 727, 754, 772, 786, 813, 850, 863, 904, 941, 954]
const TX_CODES = [210, 214, 254, 281, 325, 346, 361, 409, 430, 432, 469, 512, 682, 713, 726, 737, 806, 817, 830, 832, 903, 915, 936, 940, 956, 972, 979]

for (const c of MA_CODES) AREA_CODE_STATE[c] = 'MA'
for (const c of CT_CODES) AREA_CODE_STATE[c] = 'CT'
for (const c of NY_CODES) AREA_CODE_STATE[c] = 'NY'
for (const c of FL_CODES) AREA_CODE_STATE[c] = 'FL'
for (const c of TX_CODES) AREA_CODE_STATE[c] = 'TX'

function getStateFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('1') ? digits.slice(1) : digits
  if (normalized.length >= 10) {
    const areaCode = parseInt(normalized.slice(0, 3), 10)
    return AREA_CODE_STATE[areaCode] || 'Other'
  }
  return 'Other'
}

const EMPTY_STATE_COUNTS: Record<string, number> = { MA: 0, CT: 0, NY: 0, FL: 0, TX: 0, Other: 0 }

export async function GET(req: NextRequest) {
  const session = await auth()
  const adminSession = req.cookies.get('admin_session')
  if (!session && adminSession?.value !== 'valid') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const stateFilter = searchParams.get('state') || 'all'
  const normalizedStateFilter = stateFilter === 'all' ? 'all' : stateFilter.toUpperCase()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let total = 0
  let ghlError: string | null = null
  let sampleContacts: Array<{
    id: string
    firstName?: string
    lastName?: string
    companyName?: string
    phone?: string
    tags?: string[]
    dateAdded?: string
  }> = []

  if (!GHL_TOKEN) {
    ghlError = 'GHL_TOKEN is not configured'
  } else {
    try {
      // Fetch first batch to get total + sample for state breakdown.
      // Directory city coverage should still render if GHL is unavailable.
      const res = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOC}&tag=partner-outreach&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${GHL_TOKEN}`,
            Version: '2021-04-15',
          },
          next: { revalidate: 300 },
        }
      )

      if (!res.ok) {
        ghlError = `GHL fetch failed (${res.status})`
      } else {
        const data = await res.json()
        total = data.meta?.total || data.contacts?.length || 0
        sampleContacts = (data.contacts || []) as typeof sampleContacts
      }
    } catch (err) {
      console.warn('GHL fabricator contact fetch failed:', err)
      ghlError = 'GHL fetch failed'
    }
  }

  // State breakdown from sample
  const stateCounts: Record<string, number> = { ...EMPTY_STATE_COUNTS }
  for (const c of sampleContacts) {
    const st = getStateFromPhone(c.phone || '')
    stateCounts[st] = (stateCounts[st] || 0) + 1
  }

  // Build contact list with state
  const contacts = sampleContacts.map(c => ({
    id: c.id,
    name: [c.firstName, c.lastName].filter(Boolean).join(' ') || '—',
    company: c.companyName || '—',
    phone: c.phone || '',
    state: getStateFromPhone(c.phone || ''),
    dateAdded: c.dateAdded || '',
  }))

  let cityCounts: Array<{
    city: string
    state: string
    stateCode: string
    count: number
    claimed: number
    available: number
  }> = []
  let directoryTotal = 0

  try {
    const pool = getPool()
    const cityRes = await pool.query(`
      SELECT
        city,
        state,
        state_code,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE claimed = true)::int AS claimed,
        COUNT(*) FILTER (WHERE COALESCE(claimed, false) = false)::int AS available
      FROM directory_fabricators
      WHERE status = 'active'
        AND city IS NOT NULL
        AND city <> ''
        AND ($1 = 'all' OR state_code = $1)
      GROUP BY city, state, state_code
      ORDER BY count DESC, city ASC
      LIMIT 20
    `, [normalizedStateFilter])

    cityCounts = cityRes.rows.map(row => ({
      city: row.city,
      state: row.state,
      stateCode: row.state_code,
      count: Number(row.count || 0),
      claimed: Number(row.claimed || 0),
      available: Number(row.available || 0),
    }))

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM directory_fabricators WHERE status = 'active' AND ($1 = 'all' OR state_code = $1)`,
      [normalizedStateFilter]
    )
    directoryTotal = Number(totalRes.rows[0]?.count || 0)
  } catch (err) {
    console.warn('directory fabricator city counts failed:', err)
  }

  // Apply state filter + paginate in memory (from sample of 100)
  const filtered = normalizedStateFilter === 'all' ? contacts : contacts.filter(c => c.state === normalizedStateFilter)
  const paginated = filtered.slice(offset, offset + pageSize)

  return NextResponse.json({
    total,
    sampleSize: sampleContacts.length,
    stateCounts,
    contacts: paginated,
    totalFiltered: filtered.length,
    page,
    pageSize,
    cityCounts,
    directoryTotal,
    ghlError,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const adminSession = req.cookies.get('admin_session')
  if (!session && adminSession?.value !== 'valid') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body

  if (action === 'stage-outreach') {
    // Stage SMS outreach for a single contact
    const { contactId, contactName, phone, city, citySlug, state } = body
    if (!contactId || !phone || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const slug = citySlug || city.toLowerCase().replace(/\s+/g, '-')
    const message = `Hi ${contactName || 'there'} — ${city} ${state || ''} is available for exclusive countertop leads. One partner only. quarriva.com/partners/${slug}-${(state || '').toLowerCase()}`

    const id = randomUUID()
    await run(`
      INSERT INTO staged_messages (
        id, contact_id, contact_name, phone, message, status, stage_name, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())
    `, [id, contactId, contactName || '', phone, message, 'fabricator-outreach'])

    return NextResponse.json({ ok: true, id })
  }

  if (action === 'stage-ct-outreach') {
    // Stage SMS for all CT contacts from the provided list
    const { contacts, city, citySlug } = body
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts provided' }, { status: 400 })
    }

    const slug = citySlug || city?.toLowerCase().replace(/\s+/g, '-') || 'hartford'
    const cityName = city || 'Hartford'
    const staged: string[] = []

    for (const c of contacts) {
      const message = `Hi ${c.name || 'there'} — ${cityName} CT is available for exclusive countertop leads. One partner only. quarriva.com/partners/${slug}-ct`
      const id = randomUUID()
      await run(`
        INSERT INTO staged_messages (
          id, contact_id, contact_name, phone, message, status, stage_name, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())
      `, [id, c.id, c.name || '', c.phone, message, 'ct-outreach'])
      staged.push(id)
    }

    return NextResponse.json({ ok: true, count: staged.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
