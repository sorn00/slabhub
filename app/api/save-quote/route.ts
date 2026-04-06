import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { matchFabricator, getStateDisplayName } from '../../../lib/routing'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Also run routing logic and attach result to quote record
    let routing = null
    try {
      const fabricator = await matchFabricator(body.zip || '')
      if (fabricator) {
        routing = {
          matched: true,
          fabricatorId: fabricator.fabricatorId,
          fabricatorName: fabricator.name,
          fabricatorPhone: fabricator.phone,
          state: fabricator.state,
          stateDisplay: getStateDisplayName(fabricator.state),
        }
      } else {
        routing = { matched: false, state: null }
      }
    } catch (routeErr) {
      console.error('Routing error in save-quote:', routeErr)
    }

    const entry = {
      ...body,
      id: `quote_${Date.now()}`,
      createdAt: new Date().toISOString(),
      routing,
    }

    const filePath = '/tmp/quote-requests.json'
    let existing: unknown[] = []

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        existing = JSON.parse(raw)
        if (!Array.isArray(existing)) existing = []
      } catch {
        existing = []
      }
    }

    existing.push(entry)
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2))

    return NextResponse.json({ success: true, id: entry.id, routing })
  } catch (err) {
    console.error('save-quote error:', err)
    return NextResponse.json({ success: false, error: 'Failed to save quote' }, { status: 500 })
  }
}
