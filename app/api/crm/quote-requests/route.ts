import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOCATION_ID = 'qhOziWzmOO7mYbl3U7tm'
const GHL_PIPELINE_ID = '7CiRMsaloPKQHYt2EF4r'
const GHL_VERSION = '2021-07-28'

// Stage IDs that need a quote
const QUOTE_STAGE_IDS = new Set([
  '8bc331fb-0887-4d64-80e3-ced5eb95f19e', // Qualified
  '404236a4-e1cc-4631-9c98-c9cf363f0524', // Sketch Received / Measurements Received
  '624b80a9-2a2f-401b-babd-961b21fbace3', // Ready for Templating
])

const STAGE_NAME_MAP: Record<string, string> = {
  '3e7c5602-5539-401d-bb03-a18450756fee': 'New Lead',
  '5cbfec70-6aef-41f2-aa21-c446be879ef5': 'Waiting for Response',
  '33a4e158-196f-44ba-b74f-c610d899f269': 'Engaging',
  '8bc331fb-0887-4d64-80e3-ced5eb95f19e': 'Qualified',
  '404236a4-e1cc-4631-9c98-c9cf363f0524': 'Sketch / Measurements Received',
  '232e769f-28d9-43a6-b921-ea28467a0835': 'Quote Sent',
  '2a29cc1f-0292-427a-82b1-d76319bb1906': 'Choosing Material',
  '624b80a9-2a2f-401b-babd-961b21fbace3': 'Ready for Templating',
  'ae555ecc-7124-41b5-b528-2b240ee08407': 'Templating Done',
  '0bf855d7-1cf1-4c35-a7d2-f78b655f4763': 'Live Transfer Ready',
  'c0cc20d5-d247-4b78-8840-a342c46cbe73': 'Unresponsive/Nurture',
  'edc25d8e-9bc9-412b-8c35-58d036603775': 'Closed Won',
  '54d6706b-ef75-47b9-b8c9-458bf7e511b9': 'Closed Lost',
}

function ghlHeaders() {
  return {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

async function fetchGhlOpportunities() {
  const url = `${GHL_API_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}&status=open&limit=100`
  const res = await fetch(url, { headers: ghlHeaders() })
  if (!res.ok) throw new Error(`GHL Opportunities API ${res.status}`)
  const data = await res.json()
  return (data.opportunities || []) as Array<{
    id: string
    name: string
    contactId: string
    pipelineStageId: string
    status: string
    createdAt: string
    updatedAt: string
    contact?: { id: string; name: string; phone?: string; email?: string }
  }>
}

async function fetchConversation(contactId: string) {
  try {
    const url = `${GHL_API_BASE}/conversations/search?locationId=${GHL_LOCATION_ID}&contactId=${contactId}&limit=1`
    const res = await fetch(url, { headers: ghlHeaders() })
    if (!res.ok) return null
    const data = await res.json()
    const convs = data.conversations || []
    return convs[0] as {
      id: string
      lastMessageBody?: string
      lastMessageDate?: string
      lastMessageDirection?: string
    } | null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  // Auth check
  const adminSession = req.cookies.get('admin_session')
  if (adminSession?.value !== 'valid') {
    const session = await auth()
    const role = (session?.user as { role?: string })?.role
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // --- Source 1: Quarriva DB ---
  const dbRows = await query(`
    SELECT qr.*,
           u.name as user_name, u.email as user_email,
           qf.filename as quote_file, qf.original_name as quote_file_name,
           qf.uploaded_at as quote_file_uploaded_at
    FROM quote_requests qr
    JOIN users u ON u.id = qr.user_id
    LEFT JOIN quote_files qf ON qf.quote_request_id = qr.id
    ORDER BY qr.created_at DESC
  `)

  const quarrivaRequests = dbRows.map(r => ({
    id: String(r.id),
    source: 'quarriva' as const,
    customerName: r.customer_name as string,
    email: r.user_email as string | undefined,
    phone: r.phone as string | undefined,
    stageName: undefined,
    sqftEstimate: r.sqft_estimate as number | null ?? undefined,
    notes: r.notes as string | null ?? undefined,
    status: r.status as string,
    stones: typeof r.stones === 'string'
      ? JSON.parse(r.stones)
      : (r.stones ?? null),
    // preserve extra fields for the UI
    stone_id: r.stone_id,
    stone_name: r.stone_name,
    layout: r.layout,
    sink_type: r.sink_type,
    user_name: r.user_name,
    user_email: r.user_email,
    quote_file: r.quote_file,
    quote_file_name: r.quote_file_name,
    quote_file_uploaded_at: r.quote_file_uploaded_at,
    lastMessage: undefined,
    lastMessageDirection: undefined,
    contactId: undefined,
    conversationId: undefined,
    createdAt: r.created_at as string,
  }))

  // --- Source 2: GHL pipeline ---
  let ghlRequests: Array<{
    id: string
    source: 'ghl'
    customerName: string
    email?: string
    phone?: string
    stageName?: string
    sqftEstimate?: number
    notes?: string
    status: string
    stones?: undefined
    lastMessage?: string
    lastMessageDirection?: string
    contactId?: string
    conversationId?: string
    hasStagedDraft?: boolean
    stagedDraftId?: string
    createdAt: string
  }> = []

  try {
    const opportunities = await fetchGhlOpportunities()
    const filtered = opportunities.filter(o => QUOTE_STAGE_IDS.has(o.pipelineStageId))

    // Batch conversation fetches (10 at a time)
    const withConvs: typeof ghlRequests = []
    for (let i = 0; i < filtered.length; i += 10) {
      const batch = filtered.slice(i, i + 10)
      const results = await Promise.all(
        batch.map(async opp => {
          const contactId = opp.contact?.id || opp.contactId
          const conv = await fetchConversation(contactId)
          return {
            id: opp.id,
            source: 'ghl' as const,
            customerName: opp.contact?.name || opp.name || 'Unknown',
            email: opp.contact?.email,
            phone: opp.contact?.phone,
            stageName: STAGE_NAME_MAP[opp.pipelineStageId] || opp.pipelineStageId,
            status: 'pending',
            lastMessage: conv?.lastMessageBody || undefined,
            lastMessageDirection: conv?.lastMessageDirection || undefined,
            contactId,
            conversationId: conv?.id || undefined,
            createdAt: opp.createdAt,
          }
        })
      )
      withConvs.push(...results)
    }

    // Sort: oldest first (waiting longest)
    withConvs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    // Cross-reference staged_messages for draft badges
    try {
      const staged = await query(
        "SELECT id, contact_id, contact_name, phone FROM staged_messages WHERE status = 'pending'"
      )
      const stagedByPhone = new Map<string, string>()
      const stagedByName = new Map<string, string>()
      for (const s of staged as Array<{ id: string; contact_id: string; contact_name: string; phone: string }>) {
        if (s.phone) stagedByPhone.set(s.phone.replace(/\D/g, ''), s.id)
        if (s.contact_name) stagedByName.set(s.contact_name.toLowerCase().trim(), s.id)
      }
      for (const lead of withConvs) {
        const phoneClean = (lead.phone || '').replace(/\D/g, '')
        const nameClean = (lead.customerName || '').toLowerCase().trim()
        const draftId = stagedByPhone.get(phoneClean) || stagedByName.get(nameClean)
        if (draftId) {
          lead.hasStagedDraft = true
          lead.stagedDraftId = draftId
        }
      }
    } catch {
      // DB unavailable for staged check — skip
    }

    ghlRequests = withConvs
  } catch (err) {
    console.error('GHL quote-requests fetch error:', err)
    // Return what we have from DB
  }

  // Merged list (newest first)
  const all = [...quarrivaRequests, ...ghlRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return NextResponse.json({ requests: all })
}
