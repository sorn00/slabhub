'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Stone {
  id: string
  name: string
  material: string
  primaryColor: string
  accentColor?: string
  style?: string
  priceRange: number
  finish?: string[]
  description?: string
  imageUrl?: string
  thumbnailUrl?: string
  url?: string
  tags?: string[]
}

const MATERIALS = ['all', 'quartz', 'granite', 'marble', 'quartzite']
const COLORS = ['all', 'white', 'gray', 'black', 'beige', 'brown', 'blue', 'green']
const PRICE_LABELS: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

export default function StonesPage() {
  const { data: session } = useSession()
  const [stones, setStones] = useState<Stone[]>([])
  const [filtered, setFiltered] = useState<Stone[]>([])
  const [search, setSearch] = useState('')
  const [material, setMaterial] = useState('all')
  const [color, setColor] = useState('all')
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/data/msi-catalog.json')
      .then(r => r.json())
      .then(data => {
        setStones(data)
        setFiltered(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load favorites if logged in
  useEffect(() => {
    if (session?.user) {
      fetch('/api/favorites')
        .then(r => r.ok ? r.json() : [])
        .then((favs: Array<{ stone_id: string }>) => {
          setFavorites(new Set(favs.map(f => f.stone_id)))
        })
        .catch(() => {})
    }
  }, [session])

  useEffect(() => {
    let result = stones
    if (search) result = result.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    if (material !== 'all') result = result.filter(s => s.material === material)
    if (color !== 'all') result = result.filter(s => s.primaryColor === color || s.accentColor === color)
    setFiltered(result)
  }, [search, material, color, stones])

  const toggleFavorite = useCallback(async (stone: Stone) => {
    if (!session?.user) {
      window.location.href = '/login'
      return
    }

    setToggling(prev => { const s = new Set(prev); s.add(stone.id); return s })
    const isFav = favorites.has(stone.id)

    try {
      if (isFav) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stone_id: stone.id }),
        })
        setFavorites(prev => {
          const next = new Set(prev)
          next.delete(stone.id)
          return next
        })
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
        setFavorites(prev => { const s = new Set(prev); s.add(stone.id); return s })
      }
    } catch {
      // silent fail
    } finally {
      setToggling(prev => {
        const next = new Set(prev)
        next.delete(stone.id)
        return next
      })
    }
  }, [session, favorites])

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-amber-400 font-bold text-xl">SlabHub</Link>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <Link href="/dashboard" className="text-slate-300 hover:text-white text-sm transition-colors">
              My Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-slate-300 hover:text-white text-sm transition-colors">
              Sign In
            </Link>
          )}
          <Link href="/quote" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
            Get a Quote
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Stone Catalog</h1>
        <p className="text-slate-400 mb-8">{filtered.length} stones available</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <input
            type="text"
            placeholder="Search stones..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 flex-1 min-w-48 focus:outline-none focus:border-amber-400"
          />
          <select
            value={material}
            onChange={e => setMaterial(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            {MATERIALS.map(m => <option key={m} value={m}>{m === 'all' ? 'All Materials' : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
          <select
            value={color}
            onChange={e => setColor(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            {COLORS.map(c => <option key={c} value={c}>{c === 'all' ? 'All Colors' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading stones...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No stones match your filters.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(stone => {
              const isFav = favorites.has(stone.id)
              const isToggling = toggling.has(stone.id)
              return (
                <div key={stone.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-amber-400 transition-colors group">
                  <div className="aspect-square relative bg-slate-700">
                    {stone.imageUrl ? (
                      <img
                        src={stone.imageUrl}
                        alt={stone.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-4xl">◆</div>
                    )}
                    {/* Price badge */}
                    <div className="absolute top-2 left-2 bg-slate-900/80 text-amber-400 text-xs font-bold px-2 py-1 rounded">
                      {PRICE_LABELS[stone.priceRange] || '$$'}
                    </div>
                    {/* Heart button */}
                    <button
                      onClick={() => toggleFavorite(stone)}
                      disabled={isToggling}
                      title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                        isFav
                          ? 'bg-red-500/90 text-white'
                          : 'bg-slate-900/80 text-slate-400 hover:text-red-400 hover:bg-slate-900'
                      } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isFav ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm leading-tight mb-1">{stone.name}</p>
                    <p className="text-slate-400 text-xs capitalize">{stone.material}</p>
                    {stone.finish && stone.finish.length > 0 && (
                      <p className="text-slate-500 text-xs mt-1 capitalize">{stone.finish[0]}</p>
                    )}
                    <Link
                      href={`/quote?stone=${stone.id}`}
                      className="mt-2 block text-center bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-900 text-xs font-bold py-1.5 rounded transition-colors"
                    >
                      Get Quote
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
