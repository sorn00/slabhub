'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Stone {
  id: string
  name: string
  material: string
  primaryColor: string
  priceRange: number
  imageUrl?: string
  tags?: string[]
}

interface Special {
  id: string
  title: string
  description: string
  discountText: string
  stoneId: string
  expiryDate: string
}

function ActiveSpecialBanner() {
  const [special, setSpecial] = useState<Special | null>(null)

  useEffect(() => {
    fetch('/data/specials.json')
      .then(r => r.ok ? r.json() : [])
      .then((specials: Special[]) => {
        const active = specials.find(s => new Date(s.expiryDate) > new Date())
        setSpecial(active || null)
      })
      .catch(() => {})
  }, [])

  if (!special) return null

  return (
    <div className="bg-gradient-to-r from-amber-600/20 via-amber-500/15 to-amber-600/20 border-y border-amber-500/30 py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-center flex-wrap">
        <span className="text-amber-400 font-bold">{special.title}</span>
        {special.discountText && (
          <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
            {special.discountText}
          </span>
        )}
        {special.description && (
          <span className="text-slate-300 text-sm">{special.description}</span>
        )}
        {special.stoneId && (
          <Link href={`/stones?highlight=${special.stoneId}`} className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-2">
            View Stone →
          </Link>
        )}
        <span className="text-slate-500 text-xs">Ends {new Date(special.expiryDate).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

function FeaturedStonesSection() {
  const [featuredStones, setFeaturedStones] = useState<Stone[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/data/featured-stones.json').then(r => r.ok ? r.json() : []),
      fetch('/data/msi-catalog.json').then(r => r.ok ? r.json() : []),
    ]).then(([featuredIds, catalog]: [string[], Stone[]]) => {
      if (!featuredIds.length || !catalog.length) return
      const map = new Map(catalog.map(s => [s.id, s]))
      const stones = featuredIds.map(id => map.get(id)).filter(Boolean) as Stone[]
      setFeaturedStones(stones.slice(0, 8))
    }).catch(() => {})
  }, [])

  if (!featuredStones.length) return null

  const materialColors: Record<string, string> = {
    quartz: 'bg-blue-500/20 text-blue-300',
    granite: 'bg-green-500/20 text-green-300',
    marble: 'bg-amber-500/20 text-amber-300',
    quartzite: 'bg-purple-500/20 text-purple-300',
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Featured Stones</h2>
          <p className="text-slate-400 text-sm mt-1">Handpicked selections from our catalog</p>
        </div>
        <Link href="/stones" className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors">
          Browse all →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {featuredStones.map(stone => (
          <Link
            key={stone.id}
            href={`/stones?highlight=${stone.id}`}
            className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-amber-500/50 transition-all"
          >
            <div className="aspect-[4/3] bg-slate-700 relative">
              {stone.imageUrl ? (
                <Image
                  src={stone.imageUrl}
                  alt={stone.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl">🪨</div>
              )}
              <div className="absolute top-2 left-2">
                <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  ⭐ Featured
                </span>
              </div>
            </div>
            <div className="p-3">
              <div className="text-white font-semibold text-sm truncate">{stone.name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${materialColors[stone.material] || 'bg-slate-700 text-slate-300'}`}>
                  {stone.material}
                </span>
                <span className="text-amber-400 text-xs">{'$'.repeat(stone.priceRange)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const [zip, setZip] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/quote?zip=${zip}`)
  }

  return (
    <div>
      <ActiveSpecialBanner />
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-800 opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.12),_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
            <span>◆</span> The #1 Stone Marketplace
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Find the perfect countertop.<br />
            <span className="text-amber-400">Get quotes from local fabricators.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Connect with verified stone fabricators in your area. Compare quotes, materials, and timelines — all in one place.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value)}
              placeholder="Enter your zip code"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              Get Quotes
            </button>
          </form>
          <div className="mt-4">
            <Link href="/stones" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 text-sm transition-colors">
              <span>◆</span> Or browse our stone catalog first →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-slate-800/50 border-y border-slate-700/50 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center text-sm md:text-base">
            <div className="text-slate-300">
              <span className="text-amber-400 font-bold">500+</span> fabricators nationwide
            </div>
            <div className="hidden sm:block text-slate-600">·</div>
            <div className="text-slate-300">
              <span className="text-amber-400 font-bold">10,000+</span> projects completed
            </div>
            <div className="hidden sm:block text-slate-600">·</div>
            <div className="text-slate-300">
              <span className="text-amber-400 font-bold">$200M+</span> in stone sourced
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stones */}
      <FeaturedStonesSection />

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-4">How It Works</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">Get matched with the right fabricator in minutes. No cold calling, no guesswork.</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Submit Your Project',
              desc: 'Tell us your material preferences, project size, and timeline. Takes less than 2 minutes.',
              icon: '📋',
            },
            {
              step: '02',
              title: 'Get Matched',
              desc: 'We connect you with verified fabricators in your area who specialize in your material.',
              icon: '🔍',
            },
            {
              step: '03',
              title: 'Choose Your Fabricator',
              desc: 'Review quotes, compare fabricators, and choose the best fit for your project.',
              icon: '✅',
            },
          ].map(item => (
            <div key={item.step} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{item.icon}</span>
                <span className="text-amber-500 font-bold text-sm">STEP {item.step}</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{item.title}</h3>
              <p className="text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/stones" className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-3 rounded-lg transition-colors inline-block">
            Browse Stones
          </Link>
          <Link href="/quote" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-3 rounded-lg transition-colors inline-block">
            Start Your Quote Request
          </Link>
        </div>
      </section>

      {/* Materials section */}
      <section className="bg-slate-800/30 border-y border-slate-700/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">All Stone Types, One Platform</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Granite', desc: 'Natural, durable, unique', emoji: '🪨' },
              { name: 'Quartz', desc: 'Engineered, low-maintenance', emoji: '💎' },
              { name: 'Marble', desc: 'Timeless luxury look', emoji: '🏛️' },
              { name: 'Quartzite', desc: 'Natural quartz beauty', emoji: '✨' },
            ].map(mat => (
              <div key={mat.name} className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center hover:border-amber-500/40 transition-colors">
                <div className="text-3xl mb-2">{mat.emoji}</div>
                <h3 className="text-white font-bold">{mat.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{mat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fabricator CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Are you a fabricator?</h2>
          <p className="text-slate-400 mb-6 text-lg">Get pre-qualified leads delivered to your inbox. Pay only when we deliver — $200 per lead.</p>
          <Link href="/fabricators" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-semibold text-lg transition-colors">
            Get leads in your area <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
