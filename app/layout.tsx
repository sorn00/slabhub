import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://quarriva.com'),
  title: 'Quarriva — Find Your Perfect Stone',
  description: 'Browse premium quartz, granite and marble countertops. Get instant quotes from local fabricators.',
  alternates: {
    canonical: '/',
  },
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link href="/countertops" className="text-slate-500 hover:text-slate-300 transition-colors">
                Locations
              </Link>
              <Link href="/blog" className="text-slate-500 hover:text-slate-300 transition-colors">
                Blog
              </Link>
              <Link href="/directory" className="text-slate-500 hover:text-slate-300 transition-colors">
                Directory
              </Link>
              <Link href="/fabricators" className="text-slate-500 hover:text-slate-300 transition-colors">
                For Fabricators
              </Link>
            </div>
            <p className="mt-4">
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
