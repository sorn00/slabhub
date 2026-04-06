import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { matchFabricator, getStateDisplayName } from '../../../lib/routing'

const GHL_CONFIG_PATH = '/Users/sorn/.openclaw/workspace/agents/ghl/config.json'
const FROM_NUMBER = '+16177661123'
const PENDING_QUOTES_DIR = '/Users/sorn/.openclaw/workspace/quote-bot/pending-quotes'

function loadGhlConfig() {
  try {
    const raw = fs.readFileSync(GHL_CONFIG_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function sendGhlSms(to: string, message: string): Promise<boolean> {
  const config = loadGhlConfig()
  if (!config?.ghl?.apiToken) {
    console.error('GHL config missing or no apiToken')
    return false
  }

  const body = {
    type: 'SMS',
    message,
    from: FROM_NUMBER,
    to,
  }

  try {
    const res = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ghl.apiToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-04-15',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('GHL SMS error:', res.status, txt)
      return false
    }
    return true
  } catch (err) {
    console.error('GHL SMS fetch error:', err)
    return false
  }
}

function buildSmsMessage(params: {
  state: string
  customerName: string
  phone: string
  sqft: string
  material: string
  stones: string[]
  zip: string
}): string {
  const stoneList = params.stones?.length > 0 ? params.stones.join(', ') : 'Not specified'
  return `New SlabHub lead in ${params.state}!
Customer: ${params.customerName} | ${params.phone}
Project: ${params.sqft} sqft ${params.material}
Stone interest: ${stoneList}
ZIP: ${params.zip}
Reply to claim this lead — SlabHub`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { zip, customerName, phone, email, material, sqft, stones = [] } = body

    const timestamp = Date.now()
    const id = `slabhub_${timestamp}`

    // Match fabricator
    const fabricator = await matchFabricator(zip || '')

    const stateDisplay = fabricator ? getStateDisplayName(fabricator.state) : null

    // Build lead record
    const lead = {
      id,
      createdAt: new Date().toISOString(),
      customer: { name: customerName, phone, email, zip },
      project: { material, sqft, stones },
      routing: fabricator
        ? { matched: true, fabricatorId: fabricator.fabricatorId, fabricatorName: fabricator.name, fabricatorPhone: fabricator.phone, state: fabricator.state, stateDisplay }
        : { matched: false, state: null },
    }

    // 1. Save to /tmp/quote-requests.json
    const quoteFile = '/tmp/quote-requests.json'
    let existing: unknown[] = []
    if (fs.existsSync(quoteFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(quoteFile, 'utf-8'))
        if (!Array.isArray(existing)) existing = []
      } catch { existing = [] }
    }
    existing.push(lead)
    fs.writeFileSync(quoteFile, JSON.stringify(existing, null, 2))

    // 2. Save to pending-quotes dir
    try {
      fs.mkdirSync(PENDING_QUOTES_DIR, { recursive: true })
      const isoTs = new Date().toISOString().replace(/[:.]/g, '-')
      const slug = (customerName || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const pendingFile = path.join(PENDING_QUOTES_DIR, `slabhub-${isoTs}-${slug}.json`)
      fs.writeFileSync(pendingFile, JSON.stringify(lead, null, 2))
    } catch (err) {
      console.error('Failed to write pending-quote:', err)
    }

    // 3. Notify fabricator via SMS if matched
    if (fabricator) {
      const smsMsg = buildSmsMessage({
        state: stateDisplay || fabricator.state,
        customerName: customerName || 'Unknown',
        phone: phone || 'N/A',
        sqft: sqft || 'N/A',
        material: material || 'N/A',
        stones,
        zip,
      })
      await sendGhlSms(fabricator.phone, smsMsg)
    }

    // 4. Return response
    if (fabricator) {
      return NextResponse.json({
        matched: true,
        fabricatorState: stateDisplay,
        message: `We matched you with a local fabricator!`,
        id,
      })
    } else {
      return NextResponse.json({
        matched: false,
        message: `We're expanding to your area soon! We'll notify you.`,
        id,
      })
    }
  } catch (err) {
    console.error('route-lead error:', err)
    return NextResponse.json({ success: false, error: 'Failed to route lead' }, { status: 500 })
  }
}
