'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <nav className="border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <span className="text-amber-400 text-2xl">◆</span>
          <span>Quarriva</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/stones" className="text-slate-300 hover:text-white transition-colors">
            Browse Stones
          </Link>
          <Link href="/design" className="text-slate-300 hover:text-white transition-colors">
            Design
          </Link>
          <Link href="/cabinets" className="text-slate-300 hover:text-white transition-colors">
            Cabinets
          </Link>
          <Link href="/directory" className="text-slate-300 hover:text-white transition-colors">
            Directory
          </Link>
          <Link href="/fabricators" className="text-slate-300 hover:text-white transition-colors">
            For Fabricators
          </Link>
          {session ? (
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-xs font-bold">
                {(session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
              </span>
              <span className="text-sm">My Account</span>
            </Link>
          ) : (
            <button
              onClick={() => signIn()}
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              Sign In
            </button>
          )}
          <Link href="/quote" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors">
            Get Quotes
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-300 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 px-4 py-4 flex flex-col gap-4 bg-[#0f172a]">
          <Link href="/stones" className="text-slate-300 hover:text-white transition-colors text-center" onClick={() => setMenuOpen(false)}>
            Browse Stones
          </Link>
          <Link href="/design" className="text-slate-300 hover:text-white transition-colors text-center" onClick={() => setMenuOpen(false)}>
            Design
          </Link>
          <Link href="/cabinets" className="text-slate-300 hover:text-white transition-colors text-center" onClick={() => setMenuOpen(false)}>
            Cabinets
          </Link>
          <Link href="/quote" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-center transition-colors" onClick={() => setMenuOpen(false)}>
            Get Quotes
          </Link>
          <Link href="/directory" className="text-slate-300 hover:text-white transition-colors text-center" onClick={() => setMenuOpen(false)}>
            Directory
          </Link>
          <Link href="/fabricators" className="text-slate-300 hover:text-white transition-colors text-center" onClick={() => setMenuOpen(false)}>
            For Fabricators
          </Link>
          {session ? (
            <Link href="/dashboard" className="flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-xs font-bold">
                {(session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
              </span>
              My Account
            </Link>
          ) : (
            <button
              onClick={() => { setMenuOpen(false); signIn() }}
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium text-center"
            >
              Sign In
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
