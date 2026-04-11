'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PromoSlab {
  id: number
  stone_id: string
  stone_name: string
  material: string
  primary_color: string
  style: string
  slab_width_inches: number | null
  slab_height_inches: number | null
  image_url: string | null
  tags: string[] | null
  promo_price_per_slab: number
  promo_qty: number
}

export default function PromoClient() {
  const [slabs, setSlabs] = useState<PromoSlab[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stones/promo')
      .then(r => r.json())
      .then(d => { setSlabs(d.stones || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const isLowStock = (qty: number) => qty <= 10
  const isNewArrival = (slab: PromoSlab) => slab.tags?.includes('New Arrival')
  const isBestValue = (slab: PromoSlab) => slab.tags?.includes('Best Value')

  const sizeLabel = (slab: PromoSlab) => {
    if (slab.slab_width_inches && slab.slab_height_inches) {
      return `${slab.slab_width_inches}" × ${slab.slab_height_inches}"`
    }
    return null
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-900/30 via-[#0f172a] to-slate-900 border-b border-amber-500/20">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-4">
            🔥 Limited Time Offer
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            MSI Classic Material <span className="text-amber-400">Promo</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
            Grade B quartz slabs — possible minor imperfections, incredible prices. First come, first served. No holds. All sales final.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="bg-slate-800 border border-slate-700 rounded-full px-4 py-1.5 text-slate-300">📦 Bundle pricing shown</span>
            <span className="bg-slate-800 border border-slate-700 rounded-full px-4 py-1.5 text-slate-300">➕ Add $50/slab for single purchases</span>
            <span className="bg-slate-800 border border-slate-700 rounded-full px-4 py-1.5 text-slate-300">⚡ While supplies last</span>
          </div>
        </div>
      </div>

      {/* Slab Grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center text-slate-400 py-20 animate-pulse">Loading promo slabs...</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-400">{slabs.length} slabs available</p>
              <p className="text-slate-500 text-sm">Sorted by price: low to high</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {slabs.map(slab => (
                <div key={slab.id} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-500/40 transition-all hover:shadow-lg hover:shadow-amber-500/5 group">
                  {/* Image */}
                  <div className="relative h-48 bg-slate-700 overflow-hidden">
                    {slab.image_url ? (
                      <img
                        src={slab.image_url}
                        alt={slab.stone_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <span className="text-4xl">◆</span>
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {isLowStock(slab.promo_qty) && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">⚠️ Low Stock</span>
                      )}
                      {isNewArrival(slab) && (
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">✨ New Arrival</span>
                      )}
                      {isBestValue(slab) && (
                        <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">🏆 Best Value</span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-bold text-lg mb-1">{slab.stone_name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                      <span className="capitalize">{slab.material}</span>
                      {sizeLabel(slab) && (
                        <>
                          <span>·</span>
                          <span>{sizeLabel(slab)}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-2xl font-bold text-amber-400">${slab.promo_price_per_slab.toLocaleString()}</span>
                        <span className="text-slate-400 text-sm ml-1">/slab</span>
                      </div>
                      <span className="text-slate-400 text-sm">{slab.promo_qty} available</span>
                    </div>

                    <Link
                      href={`/quote?stone=${encodeURIComponent(slab.stone_name)}&promo=true`}
                      className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2.5 rounded-lg transition-colors"
                    >
                      Get a Quote →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-12 bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to order?</h2>
              <p className="text-slate-400 mb-6">These slabs move fast. Call or text us to hold your spot — no holds on Grade B, so first payment wins.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="tel:+1-617-555-0100" className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-3 rounded-lg transition-colors">
                  📞 Call Us
                </a>
                <Link href="/quote" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-3 rounded-lg transition-colors">
                  Request a Quote
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
