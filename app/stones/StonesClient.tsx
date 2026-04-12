'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Stone {
  id: number
  stone_id: string
  stone_name: string
  material: string
  retail_sqft: number | null
  dealer_cost_sqft: number | null
  primary_color: string | null
  style: string | null
  finish: string[] | null
  tags: string[] | null
  image_url: string | null
  closeup_url: string | null
  description: string | null
  in_stock: boolean | null
  stock_sqft: number | null
  stock_slabs: number | null
}

interface SearchResult {
  stones: Stone[]
  total: number
  page: number
  pages: number
}

const MATERIALS = [
  'Granite', 'Quartz', 'Marble', 'Quartzite', 'Travertine', 'Porcelain',
  'Glazed Porcelain', 'Q plus', 'Quartz With Lumaluxe', 'Quartz With Lumaluxe Ultra',
  'Soapstone', 'Engineered Stone',
]

const COLORS = [
  'Beige', 'Black', 'Blue', 'Brown', 'Cream', 'Gold', 'Gray-Dark', 'Gray-Light',
  'Green', 'MultiColor', 'Olive', 'Terracotta', 'White', 'White-Cool', 'White-Warm', 'Yellow',
]

const FINISHES = [
  'Beveled', 'Brushed', 'Concrete', 'Flamed', 'Honed', 'Matte', 'Polished', 'Silk', 'Split Face', 'Tumbled',
]

const STYLES = [
  { value: 'marble-look', label: 'Marble Look' },
  { value: 'concrete-look', label: 'Concrete Look' },
  { value: 'granite-look', label: 'Granite Look' },
  { value: 'bold-veining', label: 'Bold Veining' },
  { value: 'subtle-veining', label: 'Subtle Veining' },
  { value: 'solid', label: 'Solid / No Veining' },
]

const PRICE_RANGES = [
  { label: '$ — Entry Level', min: 0, max: 45 },
  { label: '$$ — Mid-Range', min: 45, max: 75 },
  { label: '$$$ — Premium', min: 75, max: 120 },
  { label: '$$$$ — Luxury', min: 120, max: null },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-asc', label: 'Price Low-High' },
  { value: 'price-desc', label: 'Price High-Low' },
  { value: 'newest', label: 'Newest' },
]

function SkeletonCard() {
  return (
    <div className="bg-[#1a1a2e] rounded-xl overflow-hidden border border-slate-700/50 animate-pulse">
      <div className="aspect-[4/3] bg-slate-700/50" />
      <div className="p-4">
        <div className="h-4 bg-slate-700/50 rounded mb-2" />
        <div className="h-3 bg-slate-700/30 rounded w-2/3 mb-3" />
        <div className="flex gap-2 mb-3">
          <div className="h-5 bg-slate-700/30 rounded w-16" />
          <div className="h-5 bg-slate-700/30 rounded w-12" />
        </div>
        <div className="h-8 bg-slate-700/30 rounded" />
      </div>
    </div>
  )
}

interface FilterOption {
  value: string
  label: string
}

interface FilterSectionProps {
  title: string
  options: string[] | FilterOption[]
  selected: string[]
  onToggle: (val: string) => void
  defaultOpen?: boolean
}

function FilterSection({ title, options, selected, onToggle, defaultOpen = true }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const normalized = (options as Array<string | FilterOption>).map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  return (
    <div className="border-b border-slate-700/50 pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left mb-3 group"
      >
        <span className="text-xs font-bold tracking-widest text-slate-300 uppercase group-hover:text-white transition-colors">
          {title}
        </span>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-2">
          {normalized.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => onToggle(opt.value)}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                  selected.includes(opt.value)
                    ? 'bg-[#d4a847] border-[#d4a847]'
                    : 'border-slate-500 group-hover:border-[#d4a847]/60'
                }`}
              >
                {selected.includes(opt.value) && (
                  <svg className="w-2.5 h-2.5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span
                onClick={() => onToggle(opt.value)}
                className={`text-sm transition-colors ${
                  selected.includes(opt.value) ? 'text-[#d4a847]' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

interface StoneCard {
  stone_id: string
  stone_name: string
  image_url: string | null
}

function AddToQuoteButton({ stone }: { stone: StoneCard }) {
  const router = useRouter()
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    setLoading(true)
    const res = await fetch('/api/quote-selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stone_id: stone.stone_id, stone_name: stone.stone_name, image_url: stone.image_url }),
    })
    if (res.status === 401) {
      // Not logged in — redirect to login
      router.push(`/login?redirect=/stones`)
      return
    }
    if (res.ok) {
      setAdded(true)
      window.dispatchEvent(new Event('quoteStonesUpdated'))
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className={`flex-1 text-center text-xs font-bold py-2 rounded-lg transition-colors ${
        added
          ? 'bg-green-600 text-white cursor-default'
          : 'bg-[#d4a847] hover:bg-[#c49a40] text-slate-900'
      }`}
    >
      {loading ? '...' : added ? '✓ Added' : '+ Add to Quote'}
    </button>
  )
}

function QuoteBar() {
  const [count, setCount] = useState(0)
  const refresh = () => {
    fetch('/api/quote-selections')
      .then(r => r.json())
      .then(d => setCount(d.stones?.length || 0))
      .catch(() => {})
  }
  useEffect(() => {
    refresh()
    window.addEventListener('quoteStonesUpdated', refresh)
    return () => window.removeEventListener('quoteStonesUpdated', refresh)
  }, [])
  if (count === 0) return null
  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-slate-900 py-2 px-4 text-center text-sm font-medium">
      <Link href="/quote" className="hover:underline">
        ◆ {count} stone{count > 1 ? 's' : ''} in your quote request — tap to continue →
      </Link>
    </div>
  )
}

export default function StonesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filter state — supports multi-select for all except price
  const [materials, setMaterials] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [finishes, setFinishes] = useState<string[]>([])
  const [styles, setStyles] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<string | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState(1)

  // Results
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Init from URL params
  useEffect(() => {
    const m = searchParams.get('material')
    const c = searchParams.get('color')
    const f = searchParams.get('finish')
    const s = searchParams.get('style')
    const pr = searchParams.get('priceRange')
    const q = searchParams.get('q')
    const pg = searchParams.get('page')
    const so = searchParams.get('sort')

    if (m) setMaterials(m.split(','))
    if (c) setColors(c.split(','))
    if (f) setFinishes(f.split(','))
    if (s) setStyles(s.split(','))
    if (pr) setPriceRange(pr)
    if (q) setSearchQ(q)
    if (so) setSort(so)
    if (pg) setPage(parseInt(pg, 10))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buildApiUrl = useCallback((
    mats: string[], cols: string[], fins: string[], sts: string[],
    pr: string | null, q: string, srt: string, pg: number
  ) => {
    const params = new URLSearchParams()
    if (mats.length === 1) params.set('material', mats[0])
    if (cols.length === 1) params.set('color', cols[0])
    if (fins.length === 1) params.set('finish', fins[0])
    if (sts.length === 1) params.set('style', sts[0])
    if (pr) {
      const range = PRICE_RANGES.find(r => r.label === pr)
      if (range) {
        if (range.min > 0) params.set('priceMin', String(range.min))
        if (range.max !== null) params.set('priceMax', String(range.max))
      }
    }
    if (q) params.set('q', q)
    params.set('sort', srt)
    params.set('page', String(pg))
    if (inStockOnly) params.set('inStock', 'true')
    return `/api/stones/search?${params.toString()}`
  }, [inStockOnly])

  const buildPageUrl = useCallback((
    mats: string[], cols: string[], fins: string[], sts: string[],
    pr: string | null, q: string, srt: string, pg: number
  ) => {
    const params = new URLSearchParams()
    if (mats.length) params.set('material', mats.join(','))
    if (cols.length) params.set('color', cols.join(','))
    if (fins.length) params.set('finish', fins.join(','))
    if (sts.length) params.set('style', sts.join(','))
    if (pr) params.set('priceRange', pr)
    if (q) params.set('q', q)
    if (srt !== 'popular') params.set('sort', srt)
    if (pg > 1) params.set('page', String(pg))
    const s = params.toString()
    return s ? `/stones?${s}` : '/stones'
  }, [])

  const fetchResults = useCallback(async (
    mats: string[], cols: string[], fins: string[], sts: string[],
    pr: string | null, q: string, srt: string, pg: number
  ) => {
    setLoading(true)
    try {
      // For multi-select, fetch each combo or just use first value for now
      // Current API supports single value per filter; for multi we do client-side note
      const url = buildApiUrl(mats, cols, fins, sts, pr, q, srt, pg)
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [buildApiUrl])

  // Debounced effect when filters change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResults(materials, colors, finishes, styles, priceRange, searchQ, sort, page)
      // Update URL
      const url = buildPageUrl(materials, colors, finishes, styles, priceRange, searchQ, sort, page)
      window.history.replaceState(null, '', url)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [materials, colors, finishes, styles, priceRange, inStockOnly, searchQ, sort, page, fetchResults, buildPageUrl])

  const toggleMulti = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
    setPage(1)
  }

  const togglePrice = (label: string) => {
    setPriceRange(prev => prev === label ? null : label)
    setPage(1)
  }

  const clearAll = () => {
    setMaterials([])
    setColors([])
    setFinishes([])
    setStyles([])
    setPriceRange(null)
    setSearchQ('')
    setSort('popular')
    setPage(1)
  }

  const hasActiveFilters = materials.length > 0 || colors.length > 0 || finishes.length > 0 ||
    styles.length > 0 || priceRange !== null || searchQ !== '' || inStockOnly

  const filterPanel = (
    <div className="space-y-1">
      {/* In Stock toggle */}
      <div className="mb-4">
        <button
          onClick={() => { setInStockOnly(prev => !prev); setPage(1) }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
            inStockOnly
              ? 'bg-green-500/15 border-green-500/40 text-green-400'
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
          }`}
        >
          <span>✓ In Stock — Boston</span>
          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            inStockOnly ? 'border-green-400 bg-green-400' : 'border-slate-500'
          }`}>
            {inStockOnly && <span className="text-slate-900 text-xs font-bold">✓</span>}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="text-xs font-bold tracking-widest text-slate-300 uppercase mb-3">Search</div>
        <input
          type="text"
          placeholder="Product name..."
          value={searchQ}
          onChange={e => { setSearchQ(e.target.value); setPage(1) }}
          className="w-full bg-[#0f1117] border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4a847] transition-colors"
        />
      </div>

      <FilterSection
        title="Material"
        options={MATERIALS}
        selected={materials}
        onToggle={val => toggleMulti(setMaterials, val)}
      />
      <FilterSection
        title="Color"
        options={COLORS}
        selected={colors}
        onToggle={val => toggleMulti(setColors, val)}
      />
      <FilterSection
        title="Finish"
        options={FINISHES}
        selected={finishes}
        onToggle={val => toggleMulti(setFinishes, val)}
      />
      <FilterSection
        title="Style"
        options={STYLES}
        selected={styles}
        onToggle={val => toggleMulti(setStyles, val)}
      />

      {/* Price Range */}
      <div className="border-b border-slate-700/50 pb-4 mb-4">
        <div className="text-xs font-bold tracking-widest text-slate-300 uppercase mb-3">Price Range</div>
        <div className="space-y-2">
          {PRICE_RANGES.map(pr => (
            <label key={pr.label} className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => togglePrice(pr.label)}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                  priceRange === pr.label
                    ? 'bg-[#d4a847] border-[#d4a847]'
                    : 'border-slate-500 group-hover:border-[#d4a847]/60'
                }`}
              >
                {priceRange === pr.label && (
                  <svg className="w-2.5 h-2.5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span
                onClick={() => togglePrice(pr.label)}
                className={`text-sm transition-colors ${
                  priceRange === pr.label ? 'text-[#d4a847]' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {pr.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="w-full text-center text-sm text-slate-400 hover:text-[#d4a847] border border-slate-600 hover:border-[#d4a847]/50 py-2 rounded-lg transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <QuoteBar />
      {/* Page header */}
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Browse Stones</h1>
          <p className="text-slate-400 text-sm">Premium natural and engineered stone surfaces</p>
        </div>
      </div>

      {/* Mobile filter button */}
      <div className="md:hidden px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center gap-2 bg-[#1a1a2e] border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white hover:border-[#d4a847]/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="bg-[#d4a847] text-slate-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {materials.length + colors.length + finishes.length + styles.length + (priceRange ? 1 : 0)}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">{loading ? '...' : result ? `${result.total} stones` : ''}</span>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1) }}
            className="bg-[#1a1a2e] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4a847] transition-colors"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-[#1a1a2e] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg">Filters</span>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto flex">
        {/* Desktop filter sidebar */}
        <aside className="hidden md:block w-[280px] flex-shrink-0 border-r border-slate-800 px-5 py-6 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          {filterPanel}
        </aside>

        {/* Results area */}
        <main className="flex-1 px-4 md:px-6 py-6 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-slate-400">
              {loading ? (
                <span className="animate-pulse">Searching...</span>
              ) : result ? (
                <span>
                  Showing <span className="text-white font-medium">{(page - 1) * 25 + 1}–{Math.min(page * 25, result.total)}</span> of{' '}
                  <span className="text-white font-medium">{result.total}</span> stones
                </span>
              ) : null}
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-slate-500">Sort:</span>
              <select
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1) }}
                className="bg-[#1a1a2e] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4a847] transition-colors"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-5">
              {materials.map(m => (
                <button key={m} onClick={() => toggleMulti(setMaterials, m)}
                  className="flex items-center gap-1.5 bg-[#d4a847]/15 text-[#d4a847] border border-[#d4a847]/30 rounded-full px-3 py-1 text-xs font-medium hover:bg-[#d4a847]/25 transition-colors">
                  {m} <span>✕</span>
                </button>
              ))}
              {colors.map(c => (
                <button key={c} onClick={() => toggleMulti(setColors, c)}
                  className="flex items-center gap-1.5 bg-[#d4a847]/15 text-[#d4a847] border border-[#d4a847]/30 rounded-full px-3 py-1 text-xs font-medium hover:bg-[#d4a847]/25 transition-colors">
                  {c} <span>✕</span>
                </button>
              ))}
              {finishes.map(f => (
                <button key={f} onClick={() => toggleMulti(setFinishes, f)}
                  className="flex items-center gap-1.5 bg-[#d4a847]/15 text-[#d4a847] border border-[#d4a847]/30 rounded-full px-3 py-1 text-xs font-medium hover:bg-[#d4a847]/25 transition-colors">
                  {f} <span>✕</span>
                </button>
              ))}
              {styles.map(s => (
                <button key={s} onClick={() => toggleMulti(setStyles, s)}
                  className="flex items-center gap-1.5 bg-[#d4a847]/15 text-[#d4a847] border border-[#d4a847]/30 rounded-full px-3 py-1 text-xs font-medium hover:bg-[#d4a847]/25 transition-colors">
                  {s} <span>✕</span>
                </button>
              ))}
              {priceRange && (
                <button onClick={() => setPriceRange(null)}
                  className="flex items-center gap-1.5 bg-[#d4a847]/15 text-[#d4a847] border border-[#d4a847]/30 rounded-full px-3 py-1 text-xs font-medium hover:bg-[#d4a847]/25 transition-colors">
                  {priceRange} <span>✕</span>
                </button>
              )}
              <button onClick={clearAll} className="text-slate-400 hover:text-white text-xs px-2 py-1 underline underline-offset-2 transition-colors">
                Clear all
              </button>
            </div>
          )}

          {/* Stone grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !result || result.stones.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🪨</div>
              <div className="text-xl text-white font-semibold mb-2">No stones found</div>
              <div className="text-slate-400 text-sm mb-6">Try adjusting your filters or clearing them</div>
              <button onClick={clearAll} className="bg-[#d4a847] hover:bg-[#c49a40] text-slate-900 font-bold px-6 py-2.5 rounded-lg transition-colors">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.stones.map(stone => (
                <StoneCard key={stone.id} stone={stone} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {result && result.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(7, result.pages) }).map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-[#d4a847] text-slate-900'
                          : 'border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {result.pages > 7 && <span className="text-slate-500 text-sm px-2 self-center">...</span>}
              </div>
              <button
                onClick={() => setPage(p => Math.min(result.pages, p + 1))}
                disabled={page >= result.pages}
                className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function StoneCard({ stone }: { stone: Stone }) {
  const materialColors: Record<string, string> = {
    quartz: 'bg-blue-500/20 text-blue-300',
    granite: 'bg-green-500/20 text-green-300',
    marble: 'bg-amber-500/20 text-amber-300',
    quartzite: 'bg-purple-500/20 text-purple-300',
    travertine: 'bg-orange-500/20 text-orange-300',
    porcelain: 'bg-cyan-500/20 text-cyan-300',
  }

  const matClass = materialColors[stone.material?.toLowerCase()] || 'bg-slate-700 text-slate-300'

  return (
    <div className="bg-[#1a1a2e] rounded-xl overflow-hidden border border-slate-700/50 hover:border-[#d4a847]/50 transition-all group flex flex-col">
      {/* Image */}
      <Link href={`/stones/${stone.stone_id}`} className="block relative aspect-[4/3] bg-slate-800 overflow-hidden">
        {stone.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stone.image_url}
            alt={stone.stone_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                const fb = document.createElement('div')
                fb.className = 'absolute inset-0 flex items-center justify-center text-4xl text-slate-500'
                fb.textContent = '🪨'
                parent.appendChild(fb)
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-slate-500">🪨</div>
        )}
      </Link>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/stones/${stone.stone_id}`} className="block">
          <h3 className="text-white font-semibold text-sm leading-tight mb-2 group-hover:text-[#d4a847] transition-colors line-clamp-2">
            {stone.stone_name}
          </h3>
        </Link>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${matClass}`}>
            {stone.material}
          </span>
          {stone.primary_color && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300">
              {stone.primary_color}
            </span>
          )}
          {stone.finish && stone.finish.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
              {stone.finish[0]}
            </span>
          )}
          {stone.in_stock && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
              ✓ In Stock
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto">
          <div className="text-[#d4a847] font-semibold text-sm mb-3">
            {stone.retail_sqft
              ? stone.retail_sqft >= 120 ? '$$$$'
                : stone.retail_sqft >= 75 ? '$$$'
                : stone.retail_sqft >= 45 ? '$$'
                : '$'
              : '$$'
            }
          </div>

          <div className="flex gap-2">
            <Link
              href={`/stones/${stone.stone_id}`}
              className="flex-1 text-center bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium py-2 rounded-lg transition-colors"
            >
              View Details
            </Link>
            <AddToQuoteButton stone={stone} />
          </div>
        </div>
      </div>
    </div>
  )
}
