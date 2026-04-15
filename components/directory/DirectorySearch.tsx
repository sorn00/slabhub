'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  defaultQ: string
  defaultState: string
  defaultService: string
  defaultMsi: boolean
}

export default function DirectorySearch({ defaultQ, defaultState, defaultService, defaultMsi }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(defaultQ)
  const [state, setState] = useState(defaultState)
  const [service, setService] = useState(defaultService)
  const [msi, setMsi] = useState(defaultMsi)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (state) params.set('state', state)
    if (service) params.set('service', service)
    if (msi) params.set('msi', '1')
    router.push(`/directory${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by city, zip, or company name..."
          className="flex-1 bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 text-sm"
        />
        <select
          value={state}
          onChange={e => setState(e.target.value)}
          className="bg-slate-700/60 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 text-sm min-w-[160px]"
        >
          <option value="">All States</option>
          <option value="CT">Connecticut</option>
          <option value="MA">Massachusetts</option>
          <option value="RI">Rhode Island</option>
          <option value="NH">New Hampshire</option>
          <option value="VT">Vermont</option>
          <option value="ME">Maine</option>
        </select>
        <select
          value={service}
          onChange={e => setService(e.target.value)}
          className="bg-slate-700/60 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 text-sm min-w-[140px]"
        >
          <option value="">All Services</option>
          <option value="quartz">Quartz</option>
          <option value="granite">Granite</option>
          <option value="marble">Marble</option>
          <option value="quartzite">Quartzite</option>
          <option value="porcelain">Porcelain</option>
        </select>
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          Search
        </button>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={msi}
            onChange={e => setMsi(e.target.checked)}
            className="rounded accent-amber-500 w-4 h-4"
          />
          MSI Certified only
        </label>
      </div>
    </form>
  )
}
