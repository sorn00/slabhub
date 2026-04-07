'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StagedMessageCard from '@/components/crm/StagedMessageCard'
import PipelineBar from '@/components/crm/PipelineBar'

interface StagedMessage {
  id: string
  contact_id: string
  contact_name: string | null
  phone: string | null
  conversation_id: string | null
  message: string
  status: string
  stage_name: string | null
  context: string | null
  created_at: string
  notes: string | null
}

interface Props {
  stats: { pending: number; approvedToday: number; sentToday: number }
  stagedMessages: StagedMessage[]
  stageCounts: Record<string, number>
  isAdmin: boolean
  userName: string
}

const STATUS_TABS = ['all', 'pending', 'edited', 'sent', 'rejected'] as const

export default function CrmDashboardClient({
  stats,
  stagedMessages: initialMessages,
  stageCounts,
  isAdmin,
  userName,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<StagedMessage[]>(initialMessages)
  const [activeTab, setActiveTab] = useState<string>('pending')
  const [activeStage, setActiveStage] = useState<string | null>(null)

  const refresh = useCallback(() => {
    router.refresh()
    fetch('/api/crm/staged')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data)
      })
      .catch(() => {})
  }, [router])

  const filtered = messages.filter(m => {
    if (activeTab !== 'all' && m.status !== activeTab) return false
    if (activeStage && m.stage_name !== activeStage) return false
    return true
  })

  const pendingCount = messages.filter(m => m.status === 'pending').length
  const editedCount = messages.filter(m => m.status === 'edited').length

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-slate-700 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-amber-400 font-bold text-xl">◆ SlabHub</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden sm:block">{userName}</span>
            <Link
              href="/crm/leads"
              className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              All Leads →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-xs text-slate-400 mt-1">Pending Review</div>
          </div>
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{stats.approvedToday}</div>
            <div className="text-xs text-slate-400 mt-1">Approved Today</div>
          </div>
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#d4a847]">{stats.sentToday}</div>
            <div className="text-xs text-slate-400 mt-1">Sent Today</div>
          </div>
        </div>

        {/* Pipeline bar */}
        {Object.keys(stageCounts).length > 0 && (
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300">Pipeline Overview</h2>
              <Link href="/crm/leads" className="text-xs text-amber-400 hover:text-amber-300">
                View all leads →
              </Link>
            </div>
            <PipelineBar
              stageCounts={stageCounts}
              activeStage={activeStage}
              onStageClick={setActiveStage}
            />
          </div>
        )}

        {/* Staged messages */}
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">Message Queue</h2>
              {!isAdmin && (
                <span className="text-xs text-slate-500 italic">Reviewer mode — flag messages for admin approval</span>
              )}
            </div>
            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map(tab => {
                const count = tab === 'all'
                  ? messages.length
                  : messages.filter(m => m.status === tab).length
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                      activeTab === tab
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab} ({count})
                    {tab === 'pending' && count > 0 && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="text-3xl mb-2">📭</div>
                <div>No messages in this view</div>
                {activeTab === 'pending' && (
                  <div className="text-xs mt-1">Staged messages will appear here for review</div>
                )}
              </div>
            ) : (
              filtered.map(msg => (
                <StagedMessageCard
                  key={msg.id}
                  msg={msg}
                  isAdmin={isAdmin}
                  onUpdated={refresh}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
