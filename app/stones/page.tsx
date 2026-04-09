import { Suspense } from 'react'
import type { Metadata } from 'next'
import StonesClient from './StonesClient'

export const metadata: Metadata = {
  title: 'Browse Stones | Quarriva – Premium Stone Surfaces',
  description: 'Browse 391+ premium quartz, granite, marble, and quartzite surfaces. Filter by material, color, finish, style, and price. Get quotes from local fabricators.',
  keywords: ['stone catalog', 'quartz countertops', 'granite', 'marble', 'quartzite', 'stone search'],
  openGraph: {
    title: 'Browse Stones | Quarriva',
    description: 'Find your perfect stone surface. Filter by material, color, finish, and price.',
    type: 'website',
  },
}

export default function StonesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading stone catalog...</div>
      </div>
    }>
      <StonesClient />
    </Suspense>
  )
}
