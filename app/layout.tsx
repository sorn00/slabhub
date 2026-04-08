import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'Quarriva — Find Your Perfect Stone',
  description: 'Browse premium quartz, granite and marble countertops. Get instant quotes from local fabricators.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f172a] text-slate-100 min-h-screen">
        <SessionProvider>
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-slate-800 py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
            <p>© 2026 Quarriva. All rights reserved.</p>
            <p className="mt-1">quarriva.com — The stone marketplace for homeowners and fabricators.</p>
            <p className="mt-3">
              <Link href="/admin" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
                Admin
              </Link>
            </p>
          </div>
        </footer>
        </SessionProvider>
      </body>
    </html>
  )
}
