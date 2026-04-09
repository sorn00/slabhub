import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const STATS_FILE = '/Users/sorn/.openclaw/workspace/agents/fb-ads/fb-stats.json'

export async function GET() {
  try {
    if (!fs.existsSync(STATS_FILE)) {
      // Return empty placeholder if stats not yet generated
      return NextResponse.json({
        lastUpdated: null,
        today: { spend: 0, leads: 0, cpl: null, impressions: 0, ctr: 0, cpc: 0 },
        last7d: { spend: 0, leads: 0, cpl: null },
        last30d: { spend: 0, leads: 0, cpl: null },
        dailyBreakdown: [],
        ads: [],
        campaign: { status: 'UNKNOWN', name: 'Granite MA', dailyBudget: null },
        alerts: [],
        _empty: true
      })
    }

    const raw = fs.readFileSync(STATS_FILE, 'utf8')
    const stats = JSON.parse(raw)
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[ads route] Error reading stats:', err)
    return NextResponse.json({ error: 'Failed to load ad stats' }, { status: 500 })
  }
}

// POST: trigger fb-monitor.js run server-side (optional future use)
export async function POST() {
  return NextResponse.json({ message: 'Use cron or node fb-monitor.js to refresh stats' }, { status: 200 })
}
