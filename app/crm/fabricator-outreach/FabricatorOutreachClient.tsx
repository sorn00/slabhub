'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Item = {
  id: string
  contact_id: string
  contact_name: string
  phone?: string
  message: string
  status: string
  stage_name: string
  context?: string
  created_at: string
  sent_at?: string
  channel?: string
  notes?: string
}

function getContext(item: Item) {
  try {
    return item.context ? JSON.parse(item.context) as Record<string, string | number | boolean> : {}
  } catch {
    return {}
  }
}

function formatTime(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ItemCard({ item }: { item: Item }) {
  const router = useRouter()
  const [message, setMessage] = useState(item.message)
  const [status, setStatus] = useState(item.status)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const ctx = getContext(item)
  const channel = item.channel || (item.stage_name === 'quarriva_fabricator_email' ? 'Email' : 'SMS')
  const isDone = status === 'sent' || status === 'skipped' || status === 'rejected'

  async function update(action: 'send' | 'skip') {
    setLoading(action)
    setError('')
    try {
      const res = await fetch(`/api/crm/fabricator-outreach/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Update failed')
        return
      }
      setStatus(data.status || (action === 'send' ? 'sent' : 'skipped'))
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="border border-slate-700 bg-slate-900/40 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-white font-semibold">{item.contact_name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              channel === 'Email' ? 'text-blue-300 border-blue-500/30 bg-blue-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'
            }`}>
              {channel}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              status === 'sent' ? 'text-green-300 bg-green-500/10' :
              status === 'pending' ? 'text-yellow-300 bg-yellow-500/10' :
              'text-slate-300 bg-slate-700'
            }`}>
              {status}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {ctx.city ? `${ctx.city} · ` : ''}{ctx.email ? String(ctx.email) : item.phone || 'No contact target'} · {formatTime(item.created_at)}
          </p>
        </div>
      </div>

      {(ctx.profileUrl || ctx.claimUrl) && (
        <a className="text-xs text-amber-400 hover:text-amber-300 break-all" href={String(ctx.profileUrl || ctx.claimUrl)} target="_blank" rel="noreferrer">
          {String(ctx.profileUrl || ctx.claimUrl)}
        </a>
      )}

      {!isDone ? (
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={channel === 'Email' ? 8 : 4}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
        />
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm whitespace-pre-wrap">{message}</div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {!isDone && (
        <div className="flex gap-2">
          <button
            onClick={() => update('send')}
            disabled={!!loading}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            {loading === 'send' ? 'Sending...' : `Approve & Send ${channel}`}
          </button>
          <button
            onClick={() => update('skip')}
            disabled={!!loading}
            className="px-4 bg-red-600/30 hover:bg-red-600/50 text-red-300 text-sm font-semibold py-2 rounded-lg"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  )
}

export default function FabricatorOutreachClient({ initialItems }: { initialItems: Item[] }) {
  const [tab, setTab] = useState<'pending' | 'sent' | 'all'>('pending')
  const [channel, setChannel] = useState<'all' | 'SMS' | 'Email'>('all')
  const filtered = useMemo(() => {
    return initialItems.filter(item => {
      const itemChannel = item.channel || (item.stage_name === 'quarriva_fabricator_email' ? 'Email' : 'SMS')
      const tabMatch = tab === 'all' || item.status === tab
      const channelMatch = channel === 'all' || itemChannel === channel
      return tabMatch && channelMatch
    })
  }, [initialItems, tab, channel])

  const counts = {
    pending: initialItems.filter(i => i.status === 'pending').length,
    sent: initialItems.filter(i => i.status === 'sent').length,
    emailPending: initialItems.filter(i => i.status === 'pending' && (i.channel === 'Email' || i.stage_name === 'quarriva_fabricator_email')).length,
    smsSent: initialItems.filter(i => i.status === 'sent' && (i.channel === 'SMS' || i.stage_name !== 'quarriva_fabricator_email')).length,
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Fabricator Outreach</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review fabricator SMS and email outreach separately from homeowner/customer follow-up.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">{counts.pending}</div>
          <div className="text-xs text-slate-400">Pending</div>
        </div>
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{counts.sent}</div>
          <div className="text-xs text-slate-400">Sent</div>
        </div>
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{counts.emailPending}</div>
          <div className="text-xs text-slate-400">Email drafts</div>
        </div>
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-400">{counts.smsSent}</div>
          <div className="text-xs text-slate-400">SMS sent</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'sent', 'all'] as const).map(value => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${tab === value ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
          >
            {value}
          </button>
        ))}
        {(['all', 'SMS', 'Email'] as const).map(value => (
          <button
            key={value}
            onClick={() => setChannel(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${channel === value ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border border-slate-800 rounded-xl bg-[#1a1a2e]">No fabricator outreach in this view</div>
        ) : (
          filtered.map(item => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
