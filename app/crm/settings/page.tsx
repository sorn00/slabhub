'use client'

import { useEffect, useState } from 'react'

interface Profile {
  name: string
  email: string
  role: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/crm/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setName(data.name || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    // Validate password fields if any are filled
    const hasPasswordFields = currentPassword || newPassword || confirmPassword
    if (hasPasswordFields) {
      if (!currentPassword) {
        showToast('error', 'Please enter your current password.')
        return
      }
      if (!newPassword) {
        showToast('error', 'Please enter a new password.')
        return
      }
      if (newPassword.length < 8) {
        showToast('error', 'New password must be at least 8 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        showToast('error', 'New passwords do not match.')
        return
      }
    }

    setSaving(true)
    try {
      const body: Record<string, string> = { name }
      if (hasPasswordFields) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }

      const res = await fetch('/api/crm/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Failed to save changes.')
      } else {
        showToast('success', 'Changes saved successfully.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setProfile(prev => prev ? { ...prev, name } : prev)
      }
    } catch {
      showToast('error', 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Loading profile…</div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your profile and password</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* My Profile */}
        <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#d4a847] uppercase tracking-wider">
            My Profile
          </h2>
          <div className="border-t border-slate-700/50" />

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4a847]/40 focus:border-[#d4a847]/60 transition-all"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Email
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={profile?.email || ''}
                readOnly
                className="w-full bg-slate-800/30 border border-slate-700/30 rounded-lg px-4 py-2.5 text-slate-400 text-sm cursor-not-allowed"
              />
              <span className="text-xs text-slate-600 whitespace-nowrap">read-only</span>
            </div>
          </div>

          {/* Role (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Role
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ''}
                readOnly
                className="w-full bg-slate-800/30 border border-slate-700/30 rounded-lg px-4 py-2.5 text-slate-400 text-sm cursor-not-allowed"
              />
              <span className="text-xs text-slate-600 whitespace-nowrap">admin sets this</span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-[#1a1a2e] border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#d4a847] uppercase tracking-wider">
            Change Password
          </h2>
          <div className="border-t border-slate-700/50" />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4a847]/40 focus:border-[#d4a847]/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4a847]/40 focus:border-[#d4a847]/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4a847]/40 focus:border-[#d4a847]/60 transition-all"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-[#d4a847] hover:bg-[#c49a3c] text-black font-semibold rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
