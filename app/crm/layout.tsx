'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const NAV_ITEMS = [
  { emoji: '🏠', label: 'Dashboard', href: '/crm' },
  { emoji: '🔴', label: 'Lead Queue', href: '/crm/leads' },
  { emoji: '💬', label: 'Messages', href: '/crm/messages' },
  { emoji: '📋', label: 'Quotes', href: '/crm/quotes' },
  { emoji: '💰', label: 'Pricing', href: '/crm/pricing' },
  { emoji: '🪨', label: 'Catalog', href: '/crm/pricing' },
  { emoji: '🏭', label: 'Partners', href: '/crm/partners' },
  { emoji: '📇', label: 'Fabricators', href: '/crm/fabricators' },
]

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userName = session?.user?.name || session?.user?.email || ''

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-700/50">
        <Link href="/crm" className="flex items-center gap-2" onClick={onNav}>
          <span className="text-[#d4a847] font-bold text-xl">◆</span>
          <span className="text-white font-bold text-lg tracking-wide">Quarriva</span>
        </Link>
        <p className="text-slate-500 text-xs mt-0.5 pl-7">Admin CRM</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const isActive =
            item.href === '/crm'
              ? pathname === '/crm'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#d4a847]/15 text-[#d4a847] border border-[#d4a847]/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-3 border-t border-slate-700/50 space-y-0.5">
        {userName && (
          <div className="px-3 py-1.5 text-xs text-slate-500 truncate">
            <span className="text-slate-300 font-medium">{userName}</span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <span className="text-base">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex bg-[#0f1117] min-h-[calc(100vh-65px)]">
      {/* Desktop sidebar — sticky so it stays on scroll */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#1a1a2e] border-r border-slate-700/50 sticky top-[65px] self-start h-[calc(100vh-65px)]">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-56 bg-[#1a1a2e] border-r border-slate-700/50 z-50 transform transition-transform duration-200 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent onNav={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#1a1a2e] border-b border-slate-700/50 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-[#d4a847] font-bold">◆</span>
          <span className="text-white font-semibold">Quarriva CRM</span>
        </div>

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
