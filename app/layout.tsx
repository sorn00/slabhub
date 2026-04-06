import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'SlabHub — Find Stone Fabricators Near You',
  description: 'Find the perfect countertop. Get quotes from local stone fabricators. The #1 marketplace for granite, quartz, marble, and more.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f172a] text-slate-100 min-h-screen">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-slate-800 py-8 mt-16">
          <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
            <p>© 2026 SlabHub. All rights reserved.</p>
            <p className="mt-1">slabhub.com — The stone marketplace for homeowners and fabricators.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
