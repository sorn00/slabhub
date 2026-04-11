import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const BATCH_DIR = '/Users/sorn/.openclaw/workspace/agents/ghl'

function getLatestBatch() {
  const files = fs.readdirSync(BATCH_DIR)
    .filter(f => f.startsWith('batch-draft-') && f.endsWith('.json'))
    .sort()
    .reverse()
  if (!files.length) return null
  const raw = fs.readFileSync(path.join(BATCH_DIR, files[0]), 'utf8')
  return JSON.parse(raw)
}

export async function GET() {
  try {
    const batch = getLatestBatch()
    if (!batch) return NextResponse.json({ contacts: [], batchId: null })
    return NextResponse.json({ contacts: batch.contacts || [], batchId: batch.batchId, createdAt: batch.createdAt, total: batch.totalContacts })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load batch' }, { status: 500 })
  }
}
