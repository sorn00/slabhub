import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const PIPELINE_ID = '7CiRMsaloPKQHYt2EF4r'

const KEYWORD_LIST = [
  'sketch', 'measure', 'dimension', 'drawing', 'photo', 'pic', 'picture', 'image',
  'quote', 'price', 'pricing', 'estimate', 'material', 'granite', 'quartz', 'marble',
  'template', 'install', 'installed', 'approved', 'approve', 'yes', 'ready', 'done',
  'scheduled', 'proceed', 'looks good', "let's do it",
]

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_TOKEN}`,
    Version: '2021-04-15',
    'Content-Type': 'application/json',
  }
}

interface GHLStage {
  id: string
  name: string
  position?: number
}

interface GHLOpportunity {
  id: string
  name: string
  monetaryValue?: number
  status?: string
  stage?: { id: string; name: string }
  pipelineStageId?: string
  pipelineStage?: { id: string; name: string }
  contact?: { id: string; name: string; phone: string; email: string }
  contactId?: string
  createdAt?: string
  lastStageChangeAt?: string
}

interface GHLMessage {
  body?: string
  direction?: 'inbound' | 'outbound'
  dateAdded?: string
  attachments?: unknown[]
  type?: string
}

export interface ConversationFacts {
  conversationId: string | null
  messageCount: number
  lastDirection: 'inbound' | 'outbound' | null
  lastMessageBody: string | null
  lastMessageDate: string | null
  unreadCount: number
  hasInboundEver: boolean
  hasAttachment: boolean
  keywords: string[]
  droppedBall: boolean
}

export interface Suggestion {
  toStage: string
  toStageId: string
  reason: string
  urgent?: boolean
}

async function fetchConversationFacts(
  contactId: string,
  locationId: string,
): Promise<ConversationFacts> {
  const empty: ConversationFacts = {
    conversationId: null,
    messageCount: 0,
    lastDirection: null,
    lastMessageBody: null,
    lastMessageDate: null,
    unreadCount: 0,
    hasInboundEver: false,
    hasAttachment: false,
    keywords: [],
    droppedBall: false,
  }

  if (!contactId) return empty

  try {
    // Search for conversation by contactId
    const searchRes = await fetch(
      `${GHL_BASE}/conversations/search?locationId=${locationId}&contactId=${contactId}&limit=1`,
      { headers: ghlHeaders() }
    )
    if (!searchRes.ok) return empty

    const searchData = await searchRes.json()
    const conversations: Array<{
      id: string
      lastMessageBody?: string
      lastMessageDate?: string
      unreadCount?: number
    }> = searchData?.conversations || []

    if (conversations.length === 0) return empty

    const conv = conversations[0]
    const conversationId = conv.id
    const unreadCount = conv.unreadCount ?? 0

    // Fetch last 15 messages
    const msgRes = await fetch(
      `${GHL_BASE}/conversations/${conversationId}/messages?limit=15`,
      { headers: ghlHeaders() }
    )
    if (!msgRes.ok) {
      // Return partial info from conversation object
      return {
        conversationId,
        messageCount: 0,
        lastDirection: null,
        lastMessageBody: conv.lastMessageBody ? conv.lastMessageBody.slice(0, 120) : null,
        lastMessageDate: conv.lastMessageDate || null,
        unreadCount,
        hasInboundEver: false,
        hasAttachment: false,
        keywords: [],
        droppedBall: false,
      }
    }

    const msgData = await msgRes.json()
    const messages: GHLMessage[] = msgData?.messages || []

    const messageCount = messages.length
    const lastMsg = messages[0] // most recent first
    const lastDirection = lastMsg?.direction ?? null
    const lastMessageBody = lastMsg?.body
      ? lastMsg.body.slice(0, 120)
      : (conv.lastMessageBody?.slice(0, 120) ?? null)
    const lastMessageDate = lastMsg?.dateAdded ?? conv.lastMessageDate ?? null
    const hasInboundEver = messages.some(m => m.direction === 'inbound')

    // Check for attachments in any message
    const hasAttachment = messages.some(
      m => Array.isArray(m.attachments) && m.attachments.length > 0
    )

    // Scan ALL message bodies for keywords
    const allText = messages
      .map(m => (m.body || '').toLowerCase())
      .join(' ')

    const keywords = KEYWORD_LIST.filter(kw => allText.includes(kw))

    // droppedBall: client replied last AND there are unread messages
    const droppedBall = lastDirection === 'inbound' && unreadCount > 0

    return {
      conversationId,
      messageCount,
      lastDirection,
      lastMessageBody,
      lastMessageDate,
      unreadCount,
      hasInboundEver,
      hasAttachment,
      keywords,
      droppedBall,
    }
  } catch {
    return empty
  }
}

function computeSuggestion(
  stageName: string,
  conv: ConversationFacts,
  stageMap: Record<string, string>
): Suggestion | null {
  const { messageCount, lastDirection, unreadCount, hasInboundEver, hasAttachment, keywords, droppedBall } = conv

  const toStage = (name: string, reason: string, urgent?: boolean): Suggestion | null => {
    const toStageId = stageMap[name]
    if (!toStageId) return null
    return urgent ? { toStage: name, toStageId, reason, urgent: true } : { toStage: name, toStageId, reason }
  }

  const hasAny = (kws: string[]) => kws.some(kw => keywords.includes(kw))

  if (stageName === 'New Lead') {
    if (hasInboundEver) return toStage('Engaging', 'Client has replied — should be Engaging')
    if (messageCount > 0 && lastDirection === 'outbound') return toStage('Waiting for Response', 'Outreach sent, waiting on reply')
    if (messageCount === 0) return null
  }

  if (stageName === 'Waiting for Response') {
    if (messageCount === 0) return toStage('New Lead', 'No messages sent yet — hasn\'t been contacted')
    if (hasInboundEver) return toStage('Engaging', 'Client replied — should be Engaging')
    if (lastDirection === 'outbound') return null
  }

  if (stageName === 'Engaging') {
    if (hasAny(['sketch', 'measure', 'dimension', 'drawing', 'photo', 'pic', 'picture', 'image']) || hasAttachment) {
      return toStage('Sketch/Measurements Received', 'Client shared sketch or measurements — dropped ball, move up')
    }
    if (hasAny(['quote', 'price', 'pricing', 'estimate'])) {
      return toStage('Quote Sent', 'Quote was discussed — verify if sent')
    }
    if (droppedBall) return toStage('Engaging', '⚠️ Client replied and is waiting on us', true)
    if (lastDirection === 'outbound' && !hasInboundEver) return toStage('Waiting for Response', 'No reply yet — move back')
  }

  if (stageName === 'Qualified') {
    if (hasAny(['sketch', 'measure', 'dimension', 'drawing']) || hasAttachment) {
      return toStage('Sketch/Measurements Received', 'Measurements/sketch received — missed stage update')
    }
    if (droppedBall) return toStage('Qualified', '⚠️ Client replied and is waiting on us', true)
  }

  if (stageName === 'Sketch/Measurements Received') {
    if (hasAny(['quote', 'price', 'pricing', 'estimate'])) {
      return toStage('Quote Sent', 'Quote discussed after sketch — move forward')
    }
    if (droppedBall) return toStage('Sketch/Measurements Received', '⚠️ Client is waiting on quote', true)
  }

  if (stageName === 'Quote Sent') {
    if (messageCount === 0) return toStage('Engaging', 'Quote stage but no conversation exists')
    if (hasAny(['approved', 'approve', 'yes', 'ready', 'proceed', 'looks good', "let's do it"]) && lastDirection === 'inbound') {
      return toStage('Choosing Material', 'Client approved — move to material selection')
    }
    if (droppedBall) return toStage('Quote Sent', '⚠️ Client responded to quote — follow up now', true)
  }

  if (stageName === 'Choosing Material') {
    if (hasAny(['template', 'install', 'installed', 'scheduled', 'ready', 'done'])) {
      return toStage('Ready For Templating', 'Ready signal in conversation')
    }
    if (droppedBall) return toStage('Choosing Material', '⚠️ Client replied — check material selection', true)
  }

  // All other stages: Templating Done, Live Transfer Ready, Unresponsive/Nurture, Closed Won, Closed Lost
  return null
}

async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export async function GET() {
  const token = process.env.GHL_TOKEN
  const locationId = process.env.GHL_LOCATION_ID || 'qhOziWzmOO7mYbl3U7tm'

  if (!token) {
    return NextResponse.json({ error: 'GHL_TOKEN not set' }, { status: 500 })
  }

  try {
    // 1. Fetch pipeline stages
    const pipelineRes = await fetch(
      `${GHL_BASE}/opportunities/pipelines/${PIPELINE_ID}`,
      { headers: ghlHeaders() }
    )
    if (!pipelineRes.ok) {
      const txt = await pipelineRes.text()
      return NextResponse.json({ error: `Pipeline fetch failed: ${txt}` }, { status: 500 })
    }
    const pipelineData = await pipelineRes.json()

    const rawStages: GHLStage[] =
      pipelineData?.pipeline?.stages ||
      pipelineData?.stages ||
      []

    const stages = rawStages.map((s, i) => ({
      id: s.id,
      name: s.name,
      order: s.position ?? i,
    }))

    // Build stageMap: name → id
    const stageMap: Record<string, string> = {}
    for (const s of stages) {
      stageMap[s.name] = s.id
    }

    // Build reverse map: stageId → stageName
    const stageIdToName: Record<string, string> = {}
    for (const s of stages) {
      stageIdToName[s.id] = s.name
    }

    // 2. Fetch all opportunities (paginated)
    const allOpportunities: GHLOpportunity[] = []
    let startAfter: string | undefined = undefined

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const params = new URLSearchParams({
        location_id: locationId,
        pipeline_id: PIPELINE_ID,
        limit: '100',
      })
      if (startAfter) params.set('startAfter', startAfter)

      const oppRes = await fetch(
        `${GHL_BASE}/opportunities/search?${params.toString()}`,
        { headers: ghlHeaders() }
      )
      if (!oppRes.ok) {
        const txt = await oppRes.text()
        return NextResponse.json({ error: `Opportunities fetch failed: ${txt}` }, { status: 500 })
      }
      const oppData = await oppRes.json()
      const batch: GHLOpportunity[] = oppData?.opportunities || []
      allOpportunities.push(...batch)

      const total: number = oppData?.meta?.total ?? oppData?.total ?? batch.length
      if (allOpportunities.length >= total || batch.length < 100) break

      const lastId = batch[batch.length - 1]?.id
      if (!lastId || lastId === startAfter) break
      startAfter = lastId
    }

    // 3. Resolve stage info for each opportunity
    const now = Date.now()

    interface OppBase {
      id: string
      name: string
      phone: string
      email: string
      monetaryValue: number
      stage: string
      stageName: string
      stageId: string
      hoursStuck: number
      createdAt: string
      lastStageChangeAt: string
      contactId: string
    }

    const oppBases: OppBase[] = allOpportunities.map((opp) => {
      const stageName =
        opp.stage?.name ||
        opp.pipelineStage?.name ||
        (opp.pipelineStageId ? stageIdToName[opp.pipelineStageId] : undefined) ||
        'Unknown'

      const stageId =
        opp.stage?.id ||
        opp.pipelineStage?.id ||
        opp.pipelineStageId ||
        stageMap[stageName] ||
        ''

      const refTime = opp.lastStageChangeAt
        ? new Date(opp.lastStageChangeAt).getTime()
        : opp.createdAt
        ? new Date(opp.createdAt).getTime()
        : now

      const hoursStuck = Math.floor((now - refTime) / (1000 * 60 * 60))

      return {
        id: opp.id,
        name: opp.name || opp.contact?.name || 'Unknown',
        phone: opp.contact?.phone || '',
        email: opp.contact?.email || '',
        monetaryValue: opp.monetaryValue || 0,
        stage: stageName,
        stageName,
        stageId,
        hoursStuck,
        createdAt: opp.createdAt || '',
        lastStageChangeAt: opp.lastStageChangeAt || '',
        contactId: opp.contactId || opp.contact?.id || '',
      }
    })

    // 4. Fetch conversations in batches of 5
    const conversationFacts = await processInBatches(
      oppBases,
      5,
      (opp) => fetchConversationFacts(opp.contactId, locationId)
    )

    // 5. Combine and compute suggestions
    const opportunities = oppBases.map((opp, i) => {
      const conversation = conversationFacts[i]
      const suggestion = computeSuggestion(opp.stageName, conversation, stageMap)
      return {
        ...opp,
        conversation,
        suggestion,
      }
    })

    // 6. Compute summary stats
    const closedStages = new Set(['Closed Won', 'Closed Lost'])
    let totalValue = 0
    const counts: Record<string, number> = {}

    for (const opp of opportunities) {
      if (!closedStages.has(opp.stageName)) {
        totalValue += opp.monetaryValue
      }
      counts[opp.stageName] = (counts[opp.stageName] || 0) + 1
    }

    return NextResponse.json({
      stages,
      opportunities,
      stageMap,
      totalValue,
      counts,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
