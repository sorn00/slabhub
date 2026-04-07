'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Lead {
  id: string
  name: string
  phone: string
  email: string
  stage_name: string | null
  last_message: string | null
  last_message_at: string | null
  days_since_contact: number | null
  conversation_id: string | null
}

const STAGE_COLORS: Record<string, string> = {
  new_lead: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  waiting_for_response: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  engaging: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  qualified: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  sketch_received: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  quote_sent: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  choosing_material: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  ready_for_templating: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

interface Props {
  isAdmin: boolean
}

export default function LeadsClient({ isAdmin }: Props) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeStage, setActiveStage] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (activeStage) params.set('stage', activeStage)

      const [leadsRes, countsRes] = await Promise.all([
        fetch(`/api/crm/leads?${params}`),
        fetch('/api/crm/leads?type=stagecounts'),
      ])

      if (!leadsRes.ok) {
        const d = await leadsRes.json()
        setError(d.error || 'Failed to load leads')
        setLeads([])
      } else {
        const data = await leadsRes.json()
        setLeads(Array.isArray(data) ? data : [])
      }

      if (countsRes.ok) {
        const counts = await countsRes.json()
        setStageCounts(counts)
      }
    } catch {
      setError('Failed to connect to database')
    } finally {
      setLoading(false)
    }
  }, [search, activeStage])

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300)
    return () => clearTimeout(t)
  }, [fetchLeads])

  function formatDate(ts: string | null) {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function daysLabel(days: number | null) {
    if (days === null) return '—'
    if (days === 0) return 'Today'
    if (days === 1) return '1d ago'
    return `${days}d ago`
  }

  function daysColor(days: number | null) {
    if (days === null) return 'text-slate-500'
    if (days <= 1) return 'text-green-400'
    if (days <= 7) return 'text-yellow-400'
    return 'text-red-400'
  }

  const stages = Object.keys(stageCounts)

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-slate-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-amber-400 font-bold text-xl">◆ SlabHub</Link>
            <span className="text-slate-600">/</span>
            <Link href="/crm" className="text-slate-400 hover:text-white transition-colors">CRM</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">All Leads</span>
          </div>
          <div className="text-sm text-slate-400">
            {leads.length} leads
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Search + filters */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="flex-1 min-w-[200px] bg-[#1a1a2e] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Stage filters */}
        {stages.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveStage(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !activeStage ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All Stages
            </button>
            {stages.map(stage => (
              <button
                key={stage}
                onClick={() => setActiveStage(activeStage === stage ? null : stage)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeStage === stage
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {stage.replace(/_/g, ' ')} ({stageCounts[stage]})
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Leads table */}
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading leads…</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-3xl mb-2">🔍</div>
              <div>No leads found</div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Phone</th>
                      <th className="text-left px-4 py-3">Stage</th>
                      <th className="text-left px-4 py-3">Last Message</th>
                      <th className="text-left px-4 py-3">Last Contact</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, i) => {
                      const stageColor = STAGE_COLORS[lead.stage_name || ''] || STAGE_COLORS.default
                      return (
                        <tr
                          key={lead.id}
                          className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${
                            i === leads.length - 1 ? 'border-0' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-medium text-white">
                            {lead.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {lead.phone || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {lead.stage_name ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${stageColor}`}>
                                {lead.stage_name.replace(/_/g, ' ')}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
                            {lead.last_message || '—'}
                          </td>
                          <td className={`px-4 py-3 text-sm ${daysColor(lead.days_since_contact)}`}>
                            {daysLabel(lead.days_since_contact)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/crm/compose/${lead.id}`}
                              className="text-xs bg-[#d4a847]/20 hover:bg-[#d4a847]/30 text-[#d4a847] px-3 py-1.5 rounded-lg transition-colors font-medium"
                            >
                              Draft Message
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-800">
                {leads.map(lead => {
                  const stageColor = STAGE_COLORS[lead.stage_name || ''] || STAGE_COLORS.default
                  return (
                    <div key={lead.id} className="px-4 py-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">{lead.name || 'Unknown'}</span>
                        {lead.stage_name && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${stageColor}`}>
                            {lead.stage_name.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 flex gap-4">
                        <span>{lead.phone || '—'}</span>
                        <span className={daysColor(lead.days_since_contact)}>
                          {daysLabel(lead.days_since_contact)}
                        </span>
                      </div>
                      {lead.last_message && (
                        <div className="text-xs text-slate-500 truncate">{lead.last_message}</div>
                      )}
                      <Link
                        href={`/crm/compose/${lead.id}`}
                        className="inline-block text-xs bg-[#d4a847]/20 hover:bg-[#d4a847]/30 text-[#d4a847] px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Draft Message →
                      </Link>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
