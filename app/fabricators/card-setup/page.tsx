'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function FabricatorCardSetupContent() {
  const searchParams = useSearchParams()
  const businessName = searchParams.get('businessName') || 'your shop'
  const listingSlug = searchParams.get('listingSlug') || ''

  const listingUrl = useMemo(() => {
    return listingSlug ? `/directory/${listingSlug}` : '/directory'
  }, [listingSlug])

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="text-amber-400 text-sm font-semibold mb-2">Quarriva listing claim</p>
        <h1 className="text-3xl font-bold text-white mb-2">No card needed right now</h1>
        <p className="text-slate-400">
          We updated the launch flow. Claim your listing first, then we send your first real countertop client opportunity free, on us.
        </p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 md:p-8">
        <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4 mb-6">
          <p className="text-green-100 text-sm leading-relaxed">
            {businessName !== 'your shop' ? `${businessName}: ` : ''}no payment setup is required to claim the listing or receive the first trial opportunity.
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 mb-6">
          <h2 className="text-white text-sm font-semibold mb-3">What happens next</h2>
          <div className="space-y-3 text-sm text-slate-400">
            <p><span className="text-amber-400 font-medium">1.</span> We verify you are authorized to manage the listing.</p>
            <p><span className="text-amber-400 font-medium">2.</span> We confirm your service area and the best number for lead texts.</p>
            <p><span className="text-amber-400 font-medium">3.</span> We send your first real countertop client opportunity free, on us.</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-6 text-left">
          <p className="text-white text-sm font-semibold mb-3">Example text</p>
          <div className="rounded-2xl rounded-tl-md bg-slate-800 border border-slate-700 p-4">
            <p className="text-slate-200 text-sm leading-relaxed">
              Quarriva opportunity for {businessName}: local homeowner needs quartz countertops. First client opportunity is free, on us. Reply YES and we will send the details exclusively to your shop.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={listingUrl}
            className="block w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition-colors text-center"
          >
            Back to Listing
          </Link>
          <Link href="/directory" className="text-center text-slate-500 hover:text-slate-300 text-sm transition-colors">
            Find another listing
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function FabricatorCardSetupPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-12 text-slate-400">Loading...</div>}>
      <FabricatorCardSetupContent />
    </Suspense>
  )
}
