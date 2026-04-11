'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Stone {
  id: string
  name: string
  material: string
  primaryColor?: string
  accentColor?: string
  style?: string
  priceRange: number
  finish?: string[]
  description?: string
  imageUrl?: string
  imageLargeUrl?: string
  thumbnailUrl?: string
  closeupUrl?: string
  slabUrl?: string
  thickness?: string[]
  tags?: string[]
  seoTitle?: string
  seoMetaDescription?: string
  seoKeywords?: string[]
}

interface StoneDetailClientProps {
  stone: Stone
  related: Stone[]
}

const PRICE_LABELS: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
const PRICE_DESC: Record<number, string> = {
  1: 'Budget-friendly',
  2: 'Mid-range',
  3: 'Premium',
  4: 'Luxury',
}

type ImageTab = 'room' | 'slab' | 'closeup'

export default function StoneDetailClient({ stone, related }: StoneDetailClientProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ImageTab>('room')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  // Determine available image tabs
  const allTabs: { key: ImageTab; label: string; url?: string }[] = [
    { key: 'room' as ImageTab, label: 'Room Scene', url: stone.imageLargeUrl || stone.imageUrl },
    { key: 'slab' as ImageTab, label: 'Slab View', url: stone.slabUrl },
    { key: 'closeup' as ImageTab, label: 'Closeup', url: stone.closeupUrl },
  ]
  const tabs = allTabs.filter(t => t.url)

  const currentImage = tabs.find(t => t.key === activeTab)?.url || stone.imageUrl

  const handleSave = useCallback(async () => {
    if (!session?.user) {
      router.push('/login')
      return
    }
    setFavLoading(true)
    try {
      if (isFav) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stone_id: stone.id }),
        })
        setIsFav(false)
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stone_id: stone.id,
            stone_name: stone.name,
            stone_image: stone.imageUrl,
            stone_material: stone.material,
            stone_price_range: stone.priceRange,
          }),
        })
        setIsFav(true)
      }
    } catch {
      // silent
    } finally {
      setFavLoading(false)
    }
  }, [session, isFav, stone, router])

  const handleQuote = () => {
    if (!session?.user) {
      router.push(`/login?redirect=/quote?stone=${encodeURIComponent(stone.name)}&stoneId=${stone.id}`)
      return
    }
    router.push(`/quote?stone=${encodeURIComponent(stone.name)}&stoneId=${stone.id}`)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-16">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-amber-400 transition-colors">Home</Link>
          <span className="text-slate-600">/</span>
          <Link href="/stones" className="hover:text-amber-400 transition-colors">Stones</Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 truncate max-w-48">{stone.name}</span>
        </nav>
      </div>

      {/* Hero Image */}
      <div className="w-full h-64 md:h-96 bg-slate-800 overflow-hidden relative">
        {stone.imageUrl ? (
          <img
            src={stone.imageUrl}
            alt={`${stone.name} countertop`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-6xl">◆</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{stone.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold px-3 py-1 rounded-full capitalize">
                {stone.material}
              </span>
              <span className="bg-slate-900/70 text-amber-400 text-sm font-bold px-3 py-1 rounded-full">
                {PRICE_LABELS[stone.priceRange] || '$$'} · {PRICE_DESC[stone.priceRange] || 'Mid-range'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Image Gallery */}
          <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
            {/* Tab switcher */}
            {tabs.length > 1 && (
              <div className="flex border-b border-slate-700">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-amber-400 border-b-2 border-amber-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Image */}
            <div
              className="relative aspect-video bg-slate-900 cursor-pointer group"
              onClick={() => setLightboxOpen(true)}
            >
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={`${stone.name} ${activeTab} view`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-5xl">◆</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <span className="bg-slate-900/80 text-white text-sm px-4 py-2 rounded-full">🔍 Click to enlarge</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-bold mb-3 text-amber-400">About This Stone</h2>
            <p className="text-slate-300 leading-relaxed">{stone.description || 'No description available.'}</p>
          </div>

          {/* Quick Specs */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-bold mb-4 text-amber-400">Quick Specs</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Material</p>
                <p className="text-white font-medium capitalize">{stone.material}</p>
              </div>
              {stone.finish && stone.finish.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Finish</p>
                  <p className="text-white font-medium capitalize">{stone.finish.join(', ')}</p>
                </div>
              )}
              {stone.thickness && stone.thickness.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Thickness</p>
                  <p className="text-white font-medium">{stone.thickness.join(', ')}</p>
                </div>
              )}
              {stone.primaryColor && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Primary Color</p>
                  <p className="text-white font-medium capitalize">{stone.primaryColor}</p>
                </div>
              )}
              {stone.style && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Style</p>
                  <p className="text-white font-medium capitalize">{stone.style.replace(/-/g, ' ')}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Price Range</p>
                <p className="text-amber-400 font-bold">{PRICE_LABELS[stone.priceRange] || '$$'}</p>
              </div>
            </div>
          </div>

          {/* Related Stones */}
          {related.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4 text-amber-400">You Might Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {related.map(rel => (
                  <Link
                    key={rel.id}
                    href={`/stones/${rel.id}`}
                    className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-amber-400 transition-colors group"
                  >
                    <div className="aspect-square bg-slate-700 relative">
                      {rel.imageUrl ? (
                        <img
                          src={rel.imageUrl}
                          alt={rel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-3xl">◆</div>
                      )}
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded">
                        {PRICE_LABELS[rel.priceRange] || '$$'}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold leading-tight">{rel.name}</p>
                      <p className="text-slate-400 text-xs capitalize mt-0.5">{rel.material}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SEO Content Block */}
          {stone.seoKeywords && stone.seoKeywords.length > 0 && (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-base font-bold mb-3 text-slate-300">
                {stone.name} Countertops — Arts Marble & Granite
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Looking for {stone.name} countertops in Massachusetts? Arts Marble & Granite offers premium {stone.material} surfaces
                including {stone.name} for kitchens, bathrooms, and more. Serving the Greater Boston area, MetroWest, North Shore,
                South Shore, and all surrounding communities.
              </p>
              <div className="flex flex-wrap gap-2">
                {stone.seoKeywords.slice(0, 10).map((kw, i) => (
                  <span key={i} className="bg-slate-700/50 text-slate-400 text-xs px-2 py-1 rounded">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar — CTAs */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 sticky top-4">
            <h3 className="text-lg font-bold mb-1">{stone.name}</h3>
            <p className="text-slate-400 text-sm capitalize mb-4">{stone.material} · {PRICE_LABELS[stone.priceRange] || '$$'}</p>

            <button
              onClick={handleQuote}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-xl transition-colors text-sm mb-3"
            >
              📋 Request Quote
            </button>

            <button
              onClick={handleSave}
              disabled={favLoading}
              className={`w-full py-3 px-4 rounded-xl text-sm font-medium border transition-colors ${
                isFav
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-slate-700 border-slate-600 text-slate-200 hover:border-amber-400 hover:text-amber-400'
              } ${favLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isFav ? '❤️ Saved to Favorites' : '🤍 Save to Favorites'}
            </button>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-xs text-center leading-relaxed">
                Get a free quote from Arts Marble & Granite — serving Massachusetts homeowners since 2003.
              </p>
            </div>
          </div>

          {/* Tags */}
          {stone.tags && stone.tags.length > 0 && (
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {stone.tags.map((tag, i) => (
                  <span key={i} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-amber-400 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>
          <img
            src={currentImage}
            alt={stone.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-0 right-0 text-center text-slate-400 text-sm">
            {stone.name} · {tabs.find(t => t.key === activeTab)?.label}
          </p>
        </div>
      )}
    </div>
  )
}
