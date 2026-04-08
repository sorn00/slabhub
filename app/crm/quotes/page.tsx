import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import CrmQuotesClient from './CrmQuotesClient'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOCATION_ID = 'qhOziWzmOO7mYbl3U7tm'
const GHL_PIPELINE_ID = '7CiRMsaloPKQHYt2EF4r'
const GHL_VERSION = '2021-07-28'

const QUOTE_STAGE_IDS = new Set([
  '8bc331fb-0887-4d64-80e3-ced5eb95f19e', // Qualified
  '404236a4-e1cc-4631-9c98-c9cf363f0524', // Sketch / Measurements Received
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

async function fetchConversation(contactId: string) {
  try {
    const url = `${GHL_API_BASE}/conversations/search?locationId=${GHL_LOCATION_ID}&contactId=${contactId}&limit=1`
    const res = await fetch(url, { headers: ghlHeaders(), next: { revalidate: 120 } })
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

export default async function CrmQuotesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const userRole = (session.user as { role?: string }).role || 'reviewer'
  if (userRole !== 'admin') redirect('/crm')

  // --- Quarriva DB requests ---
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
    ...r,
    stones: typeof r.stones === 'string' ? JSON.parse(r.stones) : (r.stones ?? null),
  }))

  // --- GHL pipeline leads needing quotes ---
  let ghlLeads: Array<{
    id: string
    customerName: string
    email?: string
    phone?: string
    stageName: string
    contactId: string
    conversationId?: string
    lastMessage?: string
    lastMessageDirection?: string
    hasStagedDraft?: boolean
    stagedDraftId?: string
    createdAt: string
  }> = []

  try {
    const url = `${GHL_API_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}&status=open&limit=100`
    const res = await fetch(url, { headers: ghlHeaders(), next: { revalidate: 120 } })
    if (res.ok) {
      const data = await res.json()
      const opportunities = (data.opportunities || []) as Array<{
        id: string
        name: string
        contactId: string
        pipelineStageId: string
        createdAt: string
        contact?: { id: string; name: string; phone?: string; email?: string }
      }>

      const filtered = opportunities.filter(o => QUOTE_STAGE_IDS.has(o.pipelineStageId))

      // Batch conversation fetches
      const results: typeof ghlLeads = []
      for (let i = 0; i < filtered.length; i += 10) {
        const batch = filtered.slice(i, i + 10)
        const batchResults = await Promise.all(
          batch.map(async opp => {
            const contactId = opp.contact?.id || opp.contactId
            const conv = await fetchConversation(contactId)
            return {
              id: opp.id,
              customerName: opp.contact?.name || opp.name || 'Unknown',
              email: opp.contact?.email,
              phone: opp.contact?.phone,
              stageName: STAGE_NAME_MAP[opp.pipelineStageId] || opp.pipelineStageId,
              contactId,
              conversationId: conv?.id,
              lastMessage: conv?.lastMessageBody || undefined,
              lastMessageDirection: conv?.lastMessageDirection || undefined,
              createdAt: opp.createdAt,
            }
          })
        )
        results.push(...batchResults)
      }

      // Sort oldest first
      results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

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
        for (const lead of results) {
          const phoneClean = (lead.phone || '').replace(/\D/g, '')
          const nameClean = (lead.customerName || '').toLowerCase().trim()
          const draftId = stagedByPhone.get(phoneClean) || stagedByName.get(nameClean)
          if (draftId) {
            lead.hasStagedDraft = true
            lead.stagedDraftId = draftId
          }
        }
      } catch {
        // staged_messages unavailable — skip
      }

      ghlLeads = results
    }
  } catch (err) {
    console.error('GHL fetch error in quotes page:', err)
  }

  return <CrmQuotesClient initialRequests={quarrivaRequests} ghlLeads={ghlLeads} />
}
