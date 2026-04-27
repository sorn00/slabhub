import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_TOKEN = process.env.GHL_TOKEN || ''
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'
const GHL_PIPELINE_ID = process.env.GHL_PIPELINE_ID || '7CiRMsaloPKQHYt2EF4r'
const GHL_VERSION = '2021-07-28'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface GhlMessage {
  direction: string
  dateAdded: string
  body?: string
  message?: string
}

interface GhlConversation {
  id: string
  contactId: string
  lastMessageBody?: string
  lastMessageDate?: string
  lastMessageDirection?: string
  messages?: GhlMessage[]
}

interface GhlOpportunity {
  id: string
  name: string
  contactId: string
  pipelineStageId: string
  status: string
  monetaryValue?: number
  createdAt: string
  updatedAt: string
  contact?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
}

export interface PrioritizedLead {
  id: string
  contactId: string
  name: string
  phone: string
  email: string
  stageName: string
  pipelineStageId: string
  createdAt: string
  updatedAt: string
  priority: 'HOT' | 'WARM' | 'FOLLOW-UP' | 'MONITORING'
  conversationId: string | null
  lastMessage: string | null
  lastMessageDirection: string | null
  lastMessageAt: string | null
  lastMessageAgo: string | null
  recentMessages: Array<{ direction: string; body: string; dateAdded: string }>
  hasStagedDraft?: boolean
  stagedDraftId?: string
}

// Simple in-memory cache
let cache: { data: PrioritizedLead[]; fetchedAt: number } | null = null

function ghlHeaders() {
  return {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

async function fetchOpportunities(): Promise<GhlOpportunity[]> {
  if (!GHL_TOKEN) return []

  const url = `${GHL_API_BASE}/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}&limit=100`
  const res = await fetch(url, { headers: ghlHeaders() })
  if (!res.ok) throw new Error(`Opportunities API ${res.status}`)
  const data = await res.json()
  return data.opportunities || []
}

async function fetchConversation(contactId: string): Promise<GhlConversation | null> {
  if (!GHL_TOKEN) return null

  try {
    const url = `${GHL_API_BASE}/conversations/search?locationId=${GHL_LOCATION_ID}&contactId=${contactId}&limit=1`
    const res = await fetch(url, { headers: ghlHeaders() })
    if (!res.ok) return null
    const data = await res.json()
    const convs: GhlConversation[] = data.conversations || []
    return convs[0] || null
  } catch {
    return null
  }
}

async function fetchRecentMessages(conversationId: string): Promise<GhlMessage[]> {
  if (!GHL_TOKEN) return []

  try {
    const url = `${GHL_API_BASE}/conversations/${conversationId}/messages?limit=5`
    const res = await fetch(url, { headers: ghlHeaders() })
    if (!res.ok) return []
    const data = await res.json()
    return data.messages || []
  } catch {
    return []
  }
}

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function calcPriority(conv: GhlConversation | null, leadCreatedAt: string): PrioritizedLead['priority'] {
  const now = Date.now()

  if (!conv || !conv.lastMessageDate) {
    return 'WARM'
  }

  const lastMsgTime = new Date(conv.lastMessageDate).getTime()
  const hoursSinceMsg = (now - lastMsgTime) / 3600000
  const daysSinceMsg = hoursSinceMsg / 24

  const direction = conv.lastMessageDirection || ''

  // HOT: last message is inbound and >2 hours old
  if (direction === 'inbound' && hoursSinceMsg > 2) {
    return 'HOT'
  }

  // WARM: no messages at all
  if (!conv.lastMessageDate) {
    return 'WARM'
  }

  // FOLLOW-UP: outbound, no inbound reply in 7+ days
  if (direction === 'outbound' && daysSinceMsg >= 7) {
    return 'FOLLOW-UP'
  }

  // MONITORING: recently active (outbound within 7 days)
  return 'MONITORING'
}

const STAGE_NAME_MAP: Record<string, string> = {
  '3e7c5602-5539-401d-bb03-a18450756fee': 'New Lead',
  '5cbfec70-6aef-41f2-aa21-c446be879ef5': 'Waiting for Response',
  '33a4e158-196f-44ba-b74f-c610d899f269': 'Engaging',
  '8bc331fb-0887-4d64-80e3-ced5eb95f19e': 'Qualified',
  '404236a4-e1cc-4631-9c98-c9cf363f0524': 'Sketch Received',
  '232e769f-28d9-43a6-b921-ea28467a0835': 'Quote Sent',
  '2a29cc1f-0292-427a-82b1-d76319bb1906': 'Choosing Material',
  '624b80a9-2a2f-401b-babd-961b21fbace3': 'Ready for Templating',
  'ae555ecc-7124-41b5-b528-2b240ee08407': 'Templating Done',
  '0bf855d7-1cf1-4c35-a7d2-f78b655f4763': 'Live Transfer Ready',
  'c0cc20d5-d247-4b78-8840-a342c46cbe73': 'Unresponsive/Nurture',
  'edc25d8e-9bc9-412b-8c35-58d036603775': 'Closed Won',
  '54d6706b-ef75-47b9-b8c9-458bf7e511b9': 'Closed Lost',
}

async function buildLeads(): Promise<PrioritizedLead[]> {
  const opportunities = await fetchOpportunities()

  // Fetch conversations in parallel (batch of 10 to avoid rate limits)
  const results: PrioritizedLead[] = []

  for (let i = 0; i < opportunities.length; i += 10) {
    const batch = opportunities.slice(i, i + 10)
    const batchResults = await Promise.all(
      batch.map(async (opp) => {
        const contactId = opp.contact?.id || opp.contactId
        const conv = await fetchConversation(contactId)

        let recentMessages: GhlMessage[] = []
        if (conv?.id) {
          recentMessages = await fetchRecentMessages(conv.id)
        }

        const priority = calcPriority(conv, opp.createdAt)

        const lead: PrioritizedLead = {
          id: opp.id,
          contactId,
          name: opp.contact?.name || opp.name || 'Unknown',
          phone: opp.contact?.phone || '',
          email: opp.contact?.email || '',
          stageName: STAGE_NAME_MAP[opp.pipelineStageId] || opp.pipelineStageId || 'Unknown',
          pipelineStageId: opp.pipelineStageId,
          createdAt: opp.createdAt,
          updatedAt: opp.updatedAt,
          priority,
          conversationId: conv?.id || null,
          lastMessage: conv?.lastMessageBody || null,
          lastMessageDirection: conv?.lastMessageDirection || null,
          lastMessageAt: conv?.lastMessageDate || null,
          lastMessageAgo: timeAgo(conv?.lastMessageDate || null),
          recentMessages: recentMessages.map(m => ({
            direction: m.direction,
            body: m.body || m.message || '',
            dateAdded: m.dateAdded,
          })),
        }
        return lead
      })
    )
    results.push(...batchResults)
  }

  // Sort by priority
  const priorityOrder = { HOT: 0, WARM: 1, 'FOLLOW-UP': 2, MONITORING: 3 }

  results.sort((a, b) => {
    const pa = priorityOrder[a.priority]
    const pb = priorityOrder[b.priority]
    if (pa !== pb) return pa - pb

    // Within HOT: oldest first
    if (a.priority === 'HOT') {
      return new Date(a.lastMessageAt || 0).getTime() - new Date(b.lastMessageAt || 0).getTime()
    }
    // Within WARM: newest lead first
    if (a.priority === 'WARM') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    // Within FOLLOW-UP: oldest last contact first
    if (a.priority === 'FOLLOW-UP') {
      return new Date(a.lastMessageAt || 0).getTime() - new Date(b.lastMessageAt || 0).getTime()
    }
    // Within MONITORING: most recent first
    return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
  })

  return results
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === 'true'

  // Check cache
  if (!refresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      leads: cache.data,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      cached: true,
    })
  }

  try {
    const leads = await buildLeads()

    // Cross-reference with staged_messages — mark leads that have a pending draft
    try {
      const { query } = await import('@/lib/db')
      const staged = await query(
        "SELECT id, contact_id, contact_name, phone FROM staged_messages WHERE status = 'pending'"
      )
      // Build lookup by phone (since GHL contact IDs may differ from what we stored)
      const stagedByPhone = new Map<string, { id: string }>()
      const stagedByName = new Map<string, { id: string }>()
      for (const s of staged as Array<{ id: string; contact_id: string; contact_name: string; phone: string }>) {
        if (s.phone) stagedByPhone.set(s.phone.replace(/\D/g, ''), { id: s.id })
        if (s.contact_name) stagedByName.set(s.contact_name.toLowerCase().trim(), { id: s.id })
      }
      for (const lead of leads) {
        const phoneClean = (lead.phone || '').replace(/\D/g, '')
        const nameClean = (lead.name || '').toLowerCase().trim()
        const match = stagedByPhone.get(phoneClean) || stagedByName.get(nameClean)
        if (match) {
          lead.hasStagedDraft = true
          lead.stagedDraftId = match.id
        }
      }
    } catch {
      // DB unavailable — skip staged draft check
    }

    cache = { data: leads, fetchedAt: Date.now() }

    return NextResponse.json({
      leads,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      cached: false,
    })
  } catch (err) {
    console.error('leads-priority error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch leads from GHL', detail: String(err) },
      { status: 500 }
    )
  }
}
