import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GHL_BASE = 'https://services.leadconnectorhq.com'

export async function POST(req: NextRequest) {
  const token = process.env.GHL_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'GHL_TOKEN not set' }, { status: 500 })
  }

  let body: { opportunityId?: string; stageId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { opportunityId, stageId } = body
  if (!opportunityId || !stageId) {
    return NextResponse.json({ error: 'opportunityId and stageId are required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${GHL_BASE}/opportunities/${opportunityId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stageId }),
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ error: `GHL error: ${txt}` }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
