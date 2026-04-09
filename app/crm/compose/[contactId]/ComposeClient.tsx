'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  direction: string
  body: string
  sent_at: string
  channelLabel?: string
  channelType?: string
}

interface Contact {
  id: string
  name: string
  phone: string
  email: string
}

interface Props {
  contactId: string
  contact: Contact | null
  messages: Message[]
  conversationId: string | null
  isAdmin: boolean
  userName: string
}

export default function ComposeClient({
  contactId,
  contact,
  messages,
  conversationId,
  isAdmin,
  userName,
}: Props) {
  const router = useRouter()
  const [messageText, setMessageText] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function stageForReview() {
    if (!messageText.trim()) {
      setError('Message cannot be empty')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')

    const context = messages.slice(0, 5).map(m => ({
      direction: m.direction,
      body: m.body,
      sent_at: m.sent_at,
    }))

    const res = await fetch('/api/crm/staged', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contactId,
        contact_name: contact?.name || null,
        phone: contact?.phone || null,
        conversation_id: conversationId,
        message: messageText,
        notes: notes || null,
        context,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to stage message')
    } else {
      setSuccess('Message staged for review!')
      setMessageText('')
      setNotes('')
    }
  }

  async function sendNow() {
    if (!messageText.trim()) {
      setError('Message cannot be empty')
      return
    }
    if (!isAdmin) {
      setError('Only admins can send directly')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/crm/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId,
        conversationId,
        message: messageText,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to send message')
    } else {
      setSuccess('Message sent via GHL! ✓')
      setMessageText('')
    }
  }

  function formatTime(ts: string) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-slate-700 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <Link href="/" className="text-amber-400 font-bold">◆ Quarriva</Link>
            <span className="text-slate-600">/</span>
            <Link href="/crm" className="text-slate-400 hover:text-white">CRM</Link>
            <span className="text-slate-600">/</span>
            <Link href="/crm/leads" className="text-slate-400 hover:text-white">Leads</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white">{contact?.name || contactId}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Contact info */}
        {contact && (
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-full bg-[#d4a847]/20 flex items-center justify-center text-[#d4a847] font-bold text-lg">
                {(contact.name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-white">{contact.name || 'Unknown'}</div>
                <div className="text-sm text-slate-400">
                  {[contact.phone, contact.email].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message history */}
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300">
              Recent Conversation {messages.length > 0 ? `(${messages.length} msgs)` : ''}
            </h2>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">No messages on record</div>
            ) : (
              // Show oldest first
              [...messages].reverse().map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.direction === 'outbound'
                        ? 'bg-[#d4a847]/20 text-[#d4a847] rounded-br-sm'
                        : 'bg-slate-700 text-white rounded-bl-sm'
                    }`}
                  >
                    <div>{msg.body}</div>
                    <div className="text-xs opacity-50 mt-1 text-right flex items-center justify-end gap-1">
                      {msg.channelLabel === 'FB' && <span>📘</span>}
                      {msg.channelLabel === 'Email' && <span>📧</span>}
                      <span>{formatTime(msg.sent_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Compose */}
        <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Compose Message</h2>

          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            rows={4}
            placeholder="Type your message here…"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />

          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Internal notes (optional)"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div className="text-green-400 text-sm bg-green-500/10 rounded-lg px-3 py-2">{success}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={stageForReview}
              disabled={loading}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? '…' : '📋 Stage for Review'}
            </button>
            {isAdmin && (
              <button
                onClick={sendNow}
                disabled={loading}
                className="flex-1 bg-[#d4a847] hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? '…' : '⚡ Send Now'}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="/crm" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to CRM
          </Link>
        </div>
      </div>
    </div>
  )
}
