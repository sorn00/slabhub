'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const STEPS = ['Stones', 'Rooms', 'Photos', 'Submit']

function QuoteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; phone?: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const incomingStone = searchParams.get('stone')
  const incomingStoneId = searchParams.get('stoneId')

  const [selectedStones, setSelectedStones] = useState<Array<{ stone_id: string; stone_name: string; image_url?: string | null }>>(() => {
    // Load saved selection from sessionStorage
    let saved: Array<{ stone_id: string; stone_name: string; image_url?: string | null }> = []
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('quoteStones') : null
      if (raw) saved = JSON.parse(raw)
    } catch {}
    // If a new stone came in via URL, add it if not already in list
    if (incomingStone) {
      const alreadyAdded = saved.find(s => s.stone_id === (incomingStoneId || incomingStone))
      if (!alreadyAdded) {
        saved = [...saved, { stone_id: incomingStoneId || '', stone_name: incomingStone }]
      }
    }
    return saved
  })
  interface Room { roomType: string; sqft: string }
  const [rooms, setRooms] = useState<Room[]>([{ roomType: '', sqft: '' }])
  const [notes, setNotes] = useState('')

  const addRoom = () => setRooms(prev => [...prev, { roomType: '', sqft: '' }])
  const removeRoom = (i: number) => setRooms(prev => prev.filter((_, idx) => idx !== i))
  const updateRoom = (i: number, key: keyof Room, val: string) =>
    setRooms(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [stoneSearch, setStoneSearch] = useState('')
  const [stoneResults, setStoneResults] = useState<Array<{ stone_id: string; stone_name: string; image_url: string | null }>>([])

  // Persist stone selection to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('quoteStones', JSON.stringify(selectedStones)) } catch {}
  }, [selectedStones])

  // Clear on successful submit
  const clearSession = () => {
    try { sessionStorage.removeItem('quoteStones') } catch {}
  }

  // Check auth
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(s => {
        if (s?.user) {
          setUser({ name: s.user.name || '', email: s.user.email || '' })
        }
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
  }, [])

  // Stone search
  useEffect(() => {
    if (!stoneSearch || stoneSearch.length < 2) { setStoneResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/stones/search?q=${encodeURIComponent(stoneSearch)}&page=1`)
        .then(r => r.json())
        .then(d => setStoneResults((d.stones || []).slice(0, 6)))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [stoneSearch])


  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const arr = Array.from(newFiles).slice(0, 5 - files.length)
    setFiles(prev => [...prev, ...arr])
    arr.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const submit = async () => {
    setLoading(true)
    try {
      // Upload photos first
      let photoUrls: string[] = []
      if (files.length > 0) {
        const formData = new FormData()
        files.forEach(f => formData.append('files', f))
        const uploadRes = await fetch('/api/uploads/quote-photos', { method: 'POST', body: formData })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          photoUrls = uploadData.urls || []
        }
      }

      const primary = selectedStones[0]
      const roomSummary = rooms.filter(r => r.roomType).map(r => `${r.roomType}${r.sqft ? ' (' + r.sqft + ')' : ''}`).join(', ')
      await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stone_id: primary?.stone_id || '',
          stone_name: primary?.stone_name || '',
          customer_name: user?.name || '',
          phone: user?.phone || '',
          sqft_estimate: null,
          notes: [notes, roomSummary ? `Rooms: ${roomSummary}` : ''].filter(Boolean).join('\n') || null,
          room_type: rooms.filter(r => r.roomType).map(r => r.roomType).join(', ') || null,
          photo_urls: photoUrls,
          stones: selectedStones.map(s => ({ stoneId: s.stone_id, stoneName: s.stone_name })),
          rooms: rooms.filter(r => r.roomType),
        }),
      })
      clearSession()
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) {
    return <div className="text-center py-20 text-slate-400 animate-pulse">Loading...</div>
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-6">🔐</div>
        <h2 className="text-2xl font-bold text-white mb-3">Sign in to request a quote</h2>
        <p className="text-slate-400 mb-8">Create a free account to track your quotes and upload project photos.</p>
        <div className="flex flex-col gap-3">
          <Link href={`/login?redirect=/quote${searchParams.get('stone') ? `?stone=${searchParams.get('stone')}` : ''}`}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-8 rounded-lg transition-colors">
            Sign In
          </Link>
          <Link href={`/register?redirect=/quote${searchParams.get('stone') ? `?stone=${searchParams.get('stone')}` : ''}`}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg transition-colors">
            Create Account
          </Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-6">✅</div>
        <h2 className="text-3xl font-bold text-white mb-4">Quote request sent!</h2>
        <p className="text-slate-400 text-lg max-w-md mx-auto mb-8">
          We received your request for <strong className="text-white">{selectedStones.map(s => s.stone_name).join(', ') || 'your selection'}</strong>. We'll be in touch within 24 hours.
        </p>
        <Link href="/stones" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-3 rounded-lg transition-colors">
          Browse More Stones
        </Link>
      </div>
    )
  }

  const progress = ((step + 1) / STEPS.length) * 100
  const canNext0 = selectedStones.length > 0
  const canNext1 = rooms.some(r => !!r.roomType)
  const canSubmit = selectedStones.length > 0 && rooms.some(r => !!r.roomType)

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          {STEPS.map((s, i) => (
            <span key={s} className={i === step ? 'text-amber-400 font-medium' : i < step ? 'text-slate-400' : 'text-slate-600'}>{s}</span>
          ))}
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 md:p-8">

        {/* Step 0: Stone Selection */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Which stones?</h2>
            <p className="text-slate-400 mb-5">Add one or more stones to compare. We'll quote all of them.</p>

            {/* Selected stones list */}
            {selectedStones.length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedStones.map((s, i) => (
                  <div key={s.stone_id + i} className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                    {s.image_url && <img src={s.image_url} alt={s.stone_name} className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                    <span className="text-white font-medium flex-1 text-sm">{s.stone_name}</span>
                    <button onClick={() => setSelectedStones(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-500 hover:text-red-400 text-sm transition-colors">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                value={stoneSearch}
                onChange={e => setStoneSearch(e.target.value)}
                placeholder={selectedStones.length > 0 ? 'Add another stone...' : 'Search stones (e.g. Calacatta, Carrara...)'}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {stoneResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-xl">
                  {stoneResults
                    .filter(s => !selectedStones.find(sel => sel.stone_id === s.stone_id))
                    .map(s => (
                      <button key={s.stone_id}
                        onClick={() => {
                          setSelectedStones(prev => [...prev, s])
                          setStoneSearch('')
                          setStoneResults([])
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 transition-colors text-left">
                        {s.image_url && <img src={s.image_url} alt={s.stone_name} className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                        <span className="text-white text-sm">{s.stone_name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <Link href="/stones" className="text-amber-400 hover:text-amber-300 text-sm">Browse catalog to pick stones →</Link>

            <button onClick={() => setStep(1)} disabled={!canNext0}
              className="mt-6 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-colors">
              Continue {selectedStones.length > 0 ? `with ${selectedStones.length} stone${selectedStones.length > 1 ? 's' : ''}` : ''} →
            </button>
          </div>
        )}

        {/* Step 1: Rooms / Projects */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">What spaces need countertops?</h2>
            <p className="text-slate-400 mb-5">Add each room separately — we'll quote them all.</p>

            <div className="space-y-4 mb-4">
              {rooms.map((room, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-300 text-sm font-medium">Room {i + 1}</span>
                    {rooms.length > 1 && (
                      <button onClick={() => removeRoom(i)} className="text-slate-500 hover:text-red-400 text-sm transition-colors">✕ Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {['Kitchen', 'Bathroom', 'Island', 'Laundry', 'Office', 'Other'].map(r => (
                      <button key={r} onClick={() => updateRoom(i, 'roomType', r)}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all ${room.roomType === r ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-slate-300'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Under 30 sqft', '30–60 sqft', '60–100 sqft', '100+ sqft'].map(s => (
                      <button key={s} onClick={() => updateRoom(i, 'sqft', s)}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all ${room.sqft === s ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-600 hover:border-slate-500 text-slate-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addRoom}
              className="w-full border border-dashed border-slate-600 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 py-3 rounded-xl text-sm font-medium transition-all mb-5">
              + Add another room
            </button>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors">← Back</button>
              <button onClick={() => setStep(2)} disabled={!canNext1}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-colors">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Photos */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Upload photos & sketch</h2>
            <p className="text-slate-400 mb-5">Add photos of your space and a sketch with measurements if you have one. Up to 5 files.</p>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
              className="border-2 border-dashed border-slate-600 hover:border-amber-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 group"
            >
              <div className="text-3xl mb-2">📎</div>
              <p className="text-slate-300 font-medium group-hover:text-white transition-colors">Click or drag to upload</p>
              <p className="text-slate-500 text-sm mt-1">Photos, sketches, PDFs — max 5 files</p>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
                onChange={e => handleFiles(e.target.files)} />
            </div>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt="" className="w-full h-24 object-cover rounded-lg border border-slate-700" />
                    <button onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4">
              <label className="text-slate-300 text-sm font-medium mb-2 block">Additional notes <span className="text-slate-500">(optional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Sink cutouts, edge profile preference, special requirements..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors">← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-colors">
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Review & submit</h2>
            <p className="text-slate-400 mb-5">Confirm your details before we send this over.</p>

            <div className="bg-slate-900/60 rounded-xl p-4 space-y-3 mb-5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400 flex-shrink-0">Stone{selectedStones.length > 1 ? 's' : ''}</span>
                <span className="text-white font-medium text-right">{selectedStones.map(s => s.stone_name).join(', ')}</span>
              </div>
              {rooms.filter(r => r.roomType).map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-slate-400">Room {i + 1}</span>
                  <span className="text-white">{r.roomType}{r.sqft ? ` — ${r.sqft}` : ''}</span>
                </div>
              ))}
              {files.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Photos</span>
                  <span className="text-white">{files.length} file{files.length > 1 ? 's' : ''}</span>
                </div>
              )}
              {notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400 flex-shrink-0">Notes</span>
                  <span className="text-white text-right">{notes}</span>
                </div>
              )}
              <div className="border-t border-slate-700 pt-3 flex justify-between">
                <span className="text-slate-400">Submitting as</span>
                <span className="text-white">{user?.name} ({user?.email})</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors">← Back</button>
              <button onClick={submit} disabled={loading || !canSubmit}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-colors">
                {loading ? 'Sending...' : 'Submit Request ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuotePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="border-b border-slate-800 py-6 px-4">
        <div className="max-w-xl mx-auto">
          <h1 className="text-xl font-bold text-white">Request a Quote</h1>
          <p className="text-slate-400 text-sm">Get pricing from Arts Marble & Granite</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading...</div>}>
        <QuoteForm />
      </Suspense>
    </div>
  )
}
