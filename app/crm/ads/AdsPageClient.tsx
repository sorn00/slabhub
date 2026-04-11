'use client'

import { useEffect, useState } from 'react'

interface AdStat {
  id?: string
  name: string
  spend: number
  leads: number
  cpl: number | null
  status: string
  impressions?: number
  ctr?: number
}

interface DailyBreakdown {
  date: string
  spend: number
  leads: number
  impressions: number
}

interface Stats {
  lastUpdated: string | null
  today: { spend: number; leads: number; cpl: number | null; impressions: number; ctr: number; cpc: number }
  last7d: { spend: number; leads: number; cpl: number | null }
  last30d: { spend: number; leads: number; cpl: number | null }
  dailyBreakdown: DailyBreakdown[]
  ads: AdStat[]
  campaign: { status: string; name: string; dailyBudget: number | null }
  account?: { statusCode: number | null; statusLabel: string | null; isActive: boolean; amountSpent: number | null }
  alerts: { level: string; msg: string }[]
  recommendation?: string
  avgCpl?: number | null
  _empty?: boolean
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n as number)) return '—'
  return `$${(n as number).toFixed(2)}`
}

function fmtNum(n: number | undefined): string {
  if (!n) return '0'
  return n.toLocaleString()
}

function CPLBadge({ cpl }: { cpl: number | null }) {
  if (cpl === null) return <span className="text-slate-500 text-sm">—</span>
  const color = cpl < 20 ? 'text-green-400' : cpl < 35 ? 'text-yellow-400' : 'text-red-400'
  const icon  = cpl < 20 ? '✅' : cpl < 35 ? '⚠️' : '🔴'
  return <span className={`${color} text-sm font-semibold`}>{fmtMoney(cpl)}/lead {icon}</span>
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  const isDraft = status === 'IN_DRAFT'
  const isPaused = status === 'PAUSED' || status === 'CAMPAIGN_PAUSED'
  const colorClass = isActive
    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
    : isDraft
    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
    : isPaused
    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
    : 'bg-slate-600/30 text-slate-400 border border-slate-600/40'
  const dotClass = isActive ? 'bg-green-400' : isDraft ? 'bg-blue-400' : isPaused ? 'bg-orange-400' : 'bg-slate-400'
  const label = isDraft ? 'Draft' : isPaused ? 'Paused' : status
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${colorClass}`}>
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}

function SparkBar({ data }: { data: DailyBreakdown[] }) {
  if (!data || data.length === 0) return null
  const maxSpend = Math.max(...data.map(d => d.spend), 1)
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1.5 h-16">
        {data.map((d, i) => {
          const pct = (d.spend / maxSpend) * 100
          const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return (
            <div key={i} className="flex flex-col items-center flex-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10">
                <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white whitespace-nowrap">
                  {label}: ${d.spend.toFixed(2)} | {d.leads} leads
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-600" />
              </div>
              <div
                className={`w-full rounded-t transition-all ${d.leads > 0 ? 'bg-[#d4a847]' : 'bg-slate-600'}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-500">
            {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#d4a847] inline-block" /> Had leads</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-600 inline-block" /> No leads</span>
      </div>
    </div>
  )
}

export default function AdsPageClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/crm/ads')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStats(await res.json())
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleRefresh() {
    setRefreshing(true)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading ad stats…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
        Error loading stats: {error}
      </div>
    )
  }

  if (!stats) return null

  const { today, last7d, last30d, ads, campaign, account, alerts, dailyBreakdown, lastUpdated, _empty, recommendation, avgCpl } = stats
  const acctInactive = account && !account.isActive

  const adsFB = `https://adsmanager.facebook.com/adsmanager/manage/campaigns`

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            📣 <span>FB ADS — {campaign.name || 'Granite MA'}</span>
          </h1>
          {lastUpdated && (
            <p className="text-slate-500 text-xs mt-0.5">
              Last updated: {new Date(lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50"
          >
            {refreshing ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
          <a
            href={adsFB}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors"
          >
            View in FB Ads Manager ↗
          </a>
        </div>
      </div>

      {_empty && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
          ⚠️ No stats file found. Run <code className="bg-slate-800 px-1 rounded">node fb-monitor.js</code> to generate data.
        </div>
      )}

      {/* Account Status Warning */}
      {acctInactive && (
        <div className="bg-orange-500/10 border border-orange-500/40 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-orange-400 text-lg mt-0.5">⚠️</span>
          <div>
            <div className="text-orange-400 font-semibold text-sm">
              Account {account!.statusLabel?.replace(/_/g, ' ')}
            </div>
            <div className="text-orange-300/70 text-xs mt-0.5">
              Ads may be paused. Reactivate the account in FB Ads Manager to resume spending.
              {account!.amountSpent !== null && (
                <span className="ml-2 text-slate-400">All-time spend: ${account!.amountSpent?.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Status */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <span className="text-slate-400 text-sm">Campaign Status:</span>
        <StatusBadge status={campaign.status} />
        {campaign.dailyBudget !== null && campaign.dailyBudget !== undefined && (
          <span className="text-slate-400 text-sm ml-auto">Budget: <span className="text-white font-semibold">{fmtMoney(campaign.dailyBudget)}/day</span></span>
        )}
      </div>

      {/* KPI Grid: Today / 7d / 30d */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TODAY */}
        <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Today</div>
          <div className="text-2xl font-bold text-white">{fmtMoney(today.spend)}</div>
          <div className="text-slate-300 text-sm mt-1">{today.leads} leads</div>
          <div className="mt-2"><CPLBadge cpl={today.cpl} /></div>
          {today.ctr > 0 && <div className="text-slate-500 text-xs mt-2">CTR: {today.ctr.toFixed(2)}%</div>}
          {today.impressions > 0 && <div className="text-slate-500 text-xs">Impressions: {fmtNum(today.impressions)}</div>}
        </div>
        {/* LAST 7 DAYS */}
        <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Last 7 Days</div>
          <div className="text-2xl font-bold text-white">{fmtMoney(last7d.spend)}</div>
          <div className="text-slate-300 text-sm mt-1">{last7d.leads} leads</div>
          <div className="mt-2"><CPLBadge cpl={last7d.cpl} /></div>
        </div>
        {/* LAST 30 DAYS */}
        <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Last 30 Days</div>
          <div className="text-2xl font-bold text-white">{fmtMoney(last30d.spend)}</div>
          <div className="text-slate-300 text-sm mt-1">{last30d.leads} leads</div>
          <div className="mt-2"><CPLBadge cpl={last30d.cpl} /></div>
        </div>
      </div>

      {/* Daily Spend Chart */}
      {dailyBreakdown && dailyBreakdown.length > 0 && (
        <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl p-5">
          <div className="text-white font-semibold text-sm mb-1">Daily Spend — Last 7 Days</div>
          <SparkBar data={dailyBreakdown} />
        </div>
      )}

      {/* Ads Performance Table */}
      <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between gap-3">
          <h2 className="text-white font-semibold text-sm">⚡ Ads Performance (Last 7 Days)</h2>
          {avgCpl != null && (
            <span className="text-slate-400 text-xs">Avg CPL: <span className="text-white font-semibold">{fmtMoney(avgCpl)}</span></span>
          )}
        </div>
        {ads.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">No ad data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-5 py-3 text-left text-slate-400 font-medium">Ad Name</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">Spend</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">Leads</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">CPL</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">Impr</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">CTR</th>
                  <th className="px-4 py-3 text-center text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...ads]
                  .sort((a, b) => (b.leads - a.leads) || ((a.cpl ?? 9999) - (b.cpl ?? 9999)))
                  .map((ad, i) => {
                    const isBest = i === 0 && ad.leads > 0
                    const shortName = ad.name.length > 35 ? ad.name.slice(0, 35) + '…' : ad.name
                    return (
                    <tr key={i} className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors ${isBest ? 'bg-green-500/5' : ''}`}>
                      <td className="px-5 py-3 text-white font-medium">
                        <div className="flex items-center gap-1.5">
                          {isBest && <span className="text-[#d4a847] text-xs">🏆</span>}
                          <span title={ad.name}>{shortName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{fmtMoney(ad.spend)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{ad.leads}</td>
                      <td className="px-4 py-3 text-right">
                        {ad.cpl !== null ? (
                          <span className={`font-semibold ${ad.cpl < 20 ? 'text-green-400' : ad.cpl < 35 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {fmtMoney(ad.cpl)} {ad.cpl < 20 ? '✅' : ad.cpl < 35 ? '⚠️' : '🔴'}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">
                        {ad.impressions ? fmtNum(ad.impressions) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">
                        {ad.ctr ? `${ad.ctr.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={ad.status} />
                      </td>
                    </tr>
                  )})
                }
              </tbody>
            </table>
          </div>
        )}
        {recommendation && (
          <div className="px-5 py-3 border-t border-slate-700/50 bg-blue-500/5">
            <span className="text-blue-400 text-xs">{recommendation}</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl p-5">
        <div className="text-white font-semibold text-sm mb-3">🚨 Alerts</div>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <span>✅</span>
            <span>No active alerts — campaign looks healthy</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  a.level === 'critical'
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                }`}
              >
                <span>{a.level === 'critical' ? '🔴' : '⚠️'}</span>
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg bg-[#d4a847]/15 hover:bg-[#d4a847]/25 text-[#d4a847] border border-[#d4a847]/30 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {refreshing ? '⟳ Running…' : '▶ Run Report Now'}
        </button>
        <a
          href={adsFB}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-sm font-medium transition-colors"
        >
          📊 View in FB Ads Manager ↗
        </a>
      </div>
    </div>
  )
}
