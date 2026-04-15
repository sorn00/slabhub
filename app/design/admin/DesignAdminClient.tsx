'use client'

import { useState } from 'react'
import type { DesignRequest } from './page'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
  contacted: 'bg-green-500/20 text-green-400 border border-green-500/40',
  closed: 'bg-slate-700 text-slate-400 border border-slate-600',
}

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDim(w: string | null, l: string | null) {
  if (!w && !l) return '—'
  return [w && `${w}ft W`, l && `${l}ft L`].filter(Boolean).join(' × ')
}

interface Props {
  rows: DesignRequest[]
}

export default function DesignAdminClient({ rows }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'closed'>('all')

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  const counts = {
    all: rows.length,
    new: rows.filter(r => r.status === 'new').length,
    contacted: rows.filter(r => r.status === 'contacted').length,
    closed: rows.filter(r => r.status === 'closed').length,
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Design Requests</h1>
            <p className="text-slate-400 text-sm mt-1">{rows.length} total submissions</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'new', 'contacted', 'closed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${filter === tab
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              {tab === 'all' ? 'All' : statusLabel(tab)}{' '}
              <span className="opacity-70">({counts[tab]})</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-left">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Phone</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Location</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Room</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Budget</th>
                    <th className="px-4 py-3 font-medium hidden xl:table-cell">Timeline</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <>
                      <tr
                        key={row.id}
                        onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          <a
                            href={`mailto:${row.email}`}
                            onClick={e => e.stopPropagation()}
                            className="hover:text-amber-400 transition-colors"
                          >
                            {row.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden lg:table-cell whitespace-nowrap">
                          {row.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell whitespace-nowrap">
                          {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell capitalize whitespace-nowrap">
                          {row.room_type}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden lg:table-cell whitespace-nowrap">
                          {row.budget_range ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden xl:table-cell whitespace-nowrap">
                          {row.timeline ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[row.status] ?? STATUS_STYLES.new}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {expanded === row.id ? '▲' : '▼'}
                        </td>
                      </tr>

                      {expanded === row.id && (
                        <tr key={`${row.id}-detail`} className="border-b border-slate-700/50 bg-slate-900/40">
                          <td colSpan={10} className="px-6 py-6">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div>
                                <h4 className="text-amber-400 font-semibold text-xs uppercase tracking-widest mb-3">
                                  Project Details
                                </h4>
                                <dl className="space-y-2 text-sm">
                                  <Detail label="Room Type" value={row.room_type} />
                                  <Detail label="Dimensions" value={formatDim(row.room_width, row.room_length)} />
                                  <Detail label="Cabinet Style" value={row.cabinet_style} />
                                  <Detail label="Cabinet Finish" value={row.cabinet_finish} />
                                  <Detail label="Budget" value={row.budget_range} />
                                  <Detail label="Timeline" value={row.timeline} />
                                </dl>
                              </div>
                              <div>
                                <h4 className="text-amber-400 font-semibold text-xs uppercase tracking-widest mb-3">
                                  Stone &amp; Notes
                                </h4>
                                <dl className="space-y-2 text-sm">
                                  <Detail label="Stone Preference" value={row.stone_preference} />
                                  <Detail label="Notes" value={row.notes} multiline />
                                </dl>
                              </div>
                              <div>
                                <h4 className="text-amber-400 font-semibold text-xs uppercase tracking-widest mb-3">
                                  Contact
                                </h4>
                                <dl className="space-y-2 text-sm">
                                  <Detail label="Name" value={row.name} />
                                  <Detail label="Email" value={row.email} />
                                  <Detail label="Phone" value={row.phone} />
                                  <Detail label="City" value={row.city} />
                                  <Detail label="State" value={row.state} />
                                  {row.sketch_url && (
                                    <div className="flex gap-2">
                                      <dt className="text-slate-500 w-24 shrink-0">Sketch</dt>
                                      <dd>
                                        <a
                                          href={row.sketch_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-amber-400 hover:text-amber-300 transition-colors"
                                        >
                                          View file →
                                        </a>
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string | null | undefined
  multiline?: boolean
}) {
  if (!value) return null
  return (
    <div className={`flex gap-2 ${multiline ? 'flex-col' : ''}`}>
      <dt className="text-slate-500 shrink-0 w-24">{label}</dt>
      <dd className={`text-slate-300 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</dd>
    </div>
  )
}
