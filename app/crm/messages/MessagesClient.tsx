'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

export default function MessagesClient({
  stats,
  stagedMessages: initialMessages,
  stageCounts,
  isAdmin,
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

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Message Queue</h1>
        <p className="text-slate-400 text-sm mt-1">Review and approve staged messages before they go out.</p>
      </div>

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
            <h2 className="text-sm font-semibold text-slate-300">Filter by Pipeline Stage</h2>
            {activeStage && (
              <button
                onClick={() => setActiveStage(null)}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Clear filter ×
              </button>
            )}
          </div>
          <PipelineBar
            stageCounts={stageCounts}
            activeStage={activeStage}
            onStageClick={setActiveStage}
          />
        </div>
      )}

      {/* Message list */}
      <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Staged Messages</h2>
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
  )
}
