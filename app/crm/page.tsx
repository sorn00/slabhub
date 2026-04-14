import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import Link from 'next/link'

const GHL_TOKEN = 'pit-73ab457e-2144-4120-9d2e-b9e408ecbea4'
const GHL_LOCATION_ID = 'qhOziWzmOO7mYbl3U7tm'
const GHL_PIPELINE_ID = '7CiRMsaloPKQHYt2EF4r'
const GHL_VERSION = '2021-07-28'

async function getGhlStats() {
  try {
    const headers = {
      Authorization: `Bearer ${GHL_TOKEN}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
    }

    // Count HOT leads (inbound, unreplied >2h) — fetch opportunities
    const oppRes = await fetch(
      `https://services.leadconnectorhq.com/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}&limit=100`,
      { headers, cache: 'no-store' }
    )
    const oppData = await oppRes.json()
    const opportunities = oppData.opportunities || []

    // Count total open pipeline (non-closed opportunities)
    const openOpps = opportunities.filter(
      (o: { status: string }) => o.status !== 'won' && o.status !== 'lost'
    )

    // For HOT leads count, use cached leads-priority logic approximation
    // (full HOT calc requires per-contact conversation fetch, done in the leads page)
    // Here we just show total open as pipeline, and pending messages/quotes from DB
    return { openPipeline: openOpps.length, error: null }
  } catch (err) {
    console.error('GHL stats error:', err)
    return { openPipeline: 0, error: String(err) }
  }
}

export default async function CrmDashboardPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  // DB stats
  const pendingMsgsRow = await queryOne(
    "SELECT COUNT(*) as count FROM staged_messages WHERE status = 'pending'"
  )
  const pendingMsgs = parseInt(pendingMsgsRow?.count ?? '0', 10)

  let pendingQuotes = 0
  try {
    const pendingQuotesRow = await queryOne(
      "SELECT COUNT(*) as count FROM quote_requests WHERE status = 'pending'"
    )
    pendingQuotes = parseInt(pendingQuotesRow?.count ?? '0', 10)
  } catch {
    // Table might not exist
  }

  let pendingOutreach = 0
  try {
    const outreachRow = await queryOne(
      "SELECT COUNT(*) as count FROM outreach_queue WHERE status = 'pending'"
    )
    pendingOutreach = parseInt(outreachRow?.count ?? '0', 10)
  } catch {
    // ignore
  }

  // GHL stats
  const { openPipeline } = await getGhlStats()

  const userRole = (session.user as { role?: string }).role || 'reviewer'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Welcome back, {session.user?.name || 'team'}. Here&apos;s what needs attention.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HOT Leads */}
        <Link href="/crm/leads" className="block group">
          <div className="bg-[#1a1a2e] border border-slate-700 hover:border-red-500/40 rounded-xl p-5 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🔴</span>
              <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            <div className="text-3xl font-bold text-red-400 mb-1">?</div>
            <div className="text-sm text-slate-400">HOT Leads</div>
            <div className="text-xs text-slate-600 mt-1">Unreplied &gt;2h → View queue</div>
          </div>
        </Link>

        {/* Pending Messages */}
        <Link href="/crm/messages" className="block group">
          <div className="bg-[#1a1a2e] border border-slate-700 hover:border-[#d4a847]/40 rounded-xl p-5 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">💬</span>
              {pendingMsgs > 0 && (
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </div>
            <div className={`text-3xl font-bold mb-1 ${pendingMsgs > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
              {pendingMsgs}
            </div>
            <div className="text-sm text-slate-400">Pending Messages</div>
            <div className="text-xs text-slate-600 mt-1">Awaiting review → Review queue</div>
          </div>
        </Link>

        {/* Quote Requests */}
        {userRole === 'admin' && (
          <Link href="/crm/quotes" className="block group">
            <div className="bg-[#1a1a2e] border border-slate-700 hover:border-blue-500/40 rounded-xl p-5 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">📋</span>
                {pendingQuotes > 0 && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </div>
              <div className={`text-3xl font-bold mb-1 ${pendingQuotes > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                {pendingQuotes}
              </div>
              <div className="text-sm text-slate-400">Quote Requests</div>
              <div className="text-xs text-slate-600 mt-1">Pending → Send quotes</div>
            </div>
          </Link>
        )}

        {/* Open Pipeline */}
        <Link href="/crm/leads" className="block group">
          <div className="bg-[#1a1a2e] border border-slate-700 hover:border-[#d4a847]/40 rounded-xl p-5 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-[#d4a847] mb-1">{openPipeline}</div>
            <div className="text-sm text-slate-400">Open Pipeline</div>
            <div className="text-xs text-slate-600 mt-1">Active opportunities → View all</div>
          </div>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/crm/leads"
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔴 Work Lead Queue
          </Link>
          <Link
            href="/crm/messages"
            className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            💬 Review Messages
          </Link>
          {pendingOutreach > 0 && (
            <Link
              href="/crm/outreach"
              className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📤 Outreach Queue ({pendingOutreach})
            </Link>
          )}
          <Link
            href="/crm/sketch"
            className="flex items-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            📐 Generate Sketch
          </Link>
          {userRole === 'admin' && (
            <>
              <Link
                href="/crm/quotes"
                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                📋 Manage Quotes
              </Link>
              <Link
                href="/crm/pricing"
                className="flex items-center gap-2 bg-[#d4a847]/10 hover:bg-[#d4a847]/20 border border-[#d4a847]/20 text-[#d4a847] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                💰 Update Pricing
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
