import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = {
      ...body,
      id: `quote_${Date.now()}`,
      createdAt: new Date().toISOString(),
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

    return NextResponse.json({ success: true, id: entry.id })
  } catch (err) {
    console.error('save-quote error:', err)
    return NextResponse.json({ success: false, error: 'Failed to save quote' }, { status: 500 })
  }
}
