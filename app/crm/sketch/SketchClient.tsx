'use client'

import { useState } from 'react'

type Section = {
  id: number
  label: string
  length: number
  depth: number
  hasSink: boolean
  sinkSize: string
}

type PricingRow = {
  name: string
  material: string
  dealer_cost: string | null
  retail_price: string | null
}

type SketchResult = {
  svg: string
  totalSqft: number
  grossSqft: number
  slabs: number
  pricing: PricingRow[]
  material: string
}

const SHAPES = ['L-Shape', 'U-Shape', 'Galley', 'Straight', 'Island', 'Custom']
const MATERIALS = ['Any', 'Quartz', 'Granite', 'Marble', 'Quartzite']
const SINK_SIZES = ['30"×18"', '33"×18"', '36"×18"', '24"×18"', 'None']

const SHAPE_PRESETS: Record<string, Omit<Section, 'id'>[]> = {
  'L-Shape': [
    { label: 'Main Run', length: 10, depth: 2, hasSink: true, sinkSize: '30"×18"' },
    { label: 'Return', length: 6, depth: 2, hasSink: false, sinkSize: '30"×18"' },
  ],
  'U-Shape': [
    { label: 'Left Wall', length: 8, depth: 2, hasSink: false, sinkSize: '30"×18"' },
    { label: 'Back Wall', length: 10, depth: 2, hasSink: true, sinkSize: '30"×18"' },
    { label: 'Right Wall', length: 6, depth: 2, hasSink: false, sinkSize: '30"×18"' },
  ],
  'Galley': [
    { label: 'Main Run', length: 12, depth: 2, hasSink: true, sinkSize: '30"×18"' },
    { label: 'Island', length: 6, depth: 3, hasSink: false, sinkSize: '30"×18"' },
  ],
  'Straight': [
    { label: 'Main Run', length: 10, depth: 2, hasSink: true, sinkSize: '30"×18"' },
  ],
  'Island': [
    { label: 'Main Run', length: 10, depth: 2, hasSink: true, sinkSize: '30"×18"' },
    { label: 'Island', length: 7, depth: 3, hasSink: false, sinkSize: '30"×18"' },
  ],
  'Custom': [
    { label: 'Section 1', length: 8, depth: 2, hasSink: true, sinkSize: '30"×18"' },
  ],
}

let sectionIdCounter = 10

export default function SketchClient({ contactName: defaultName }: { contactName?: string }) {
  const [contactName, setContactName] = useState(defaultName || '')
  const [shape, setShape] = useState('L-Shape')
  const [material, setMaterial] = useState('Any')
  const [notes, setNotes] = useState('')
  const [sections, setSections] = useState<Section[]>(
    SHAPE_PRESETS['L-Shape'].map((s, i) => ({ ...s, id: i }))
  )
  const [result, setResult] = useState<SketchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalSqft = sections.reduce((sum, s) => sum + s.length * s.depth, 0)
  const grossSqft = Math.round(totalSqft * 1.15 * 10) / 10
  const slabs = Math.ceil(grossSqft / 60)

  function setShapePreset(s: string) {
    setShape(s)
    setSections(SHAPE_PRESETS[s]?.map((sec, i) => ({ ...sec, id: i })) || sections)
  }

  function updateSection(id: number, field: keyof Section, value: string | number | boolean) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  function addSection() {
    setSections(prev => [...prev, {
      id: sectionIdCounter++,
      label: `Section ${prev.length + 1}`,
      length: 6,
      depth: 2,
      hasSink: false,
      sinkSize: '30"×18"',
    }])
  }

  function removeSection(id: number) {
    setSections(prev => prev.filter(s => s.id !== id))
  }

  async function generate() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await fetch('/api/crm/sketch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName, shape, sections, material, notes }),
      })
      const d = await r.json()
      if (d.error) { setError(d.error); return }
      setResult(d)
    } catch (e) {
      setError('Generation failed: ' + String(e))
    } finally {
      setLoading(false)
    }
  }

  function downloadSVG() {
    if (!result?.svg) return
    const blob = new Blob([result.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${contactName || 'sketch'}-layout.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPNG() {
    if (!result?.svg) return
    const img = new window.Image()
    const blob = new Blob([result.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = 520
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => {
        if (!b) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(b)
        a.download = `${contactName || 'sketch'}-layout.png`
        a.click()
      })
    }
    img.src = url
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">📐 Sketch & Quote Generator</h1>
        <p className="text-slate-400 text-sm mt-1">Enter dimensions → generate layout → get slab count + pricing in seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Input form */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-white text-sm">Customer</h2>
            <input
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="Contact name"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Shape + Material */}
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-white text-sm">Layout</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kitchen Shape</label>
                <div className="flex flex-wrap gap-1.5">
                  {SHAPES.map(s => (
                    <button
                      key={s}
                      onClick={() => setShapePreset(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        shape === s
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Material</label>
                <div className="flex flex-wrap gap-1.5">
                  {MATERIALS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMaterial(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        material === m
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">Sections</h2>
              <button
                onClick={addSection}
                className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg"
              >
                + Add Section
              </button>
            </div>

            {sections.map(s => (
              <div key={s.id} className="border border-slate-700 rounded-lg p-3 space-y-2 bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s.label}
                    onChange={e => updateSection(s.id, 'label', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(s.id)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Length (ft)</label>
                    <input
                      type="number"
                      value={s.length}
                      onChange={e => updateSection(s.id, 'length', parseFloat(e.target.value) || 0)}
                      step="0.5" min="1" max="30"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Depth (ft)</label>
                    <input
                      type="number"
                      value={s.depth}
                      onChange={e => updateSection(s.id, 'depth', parseFloat(e.target.value) || 0)}
                      step="0.5" min="1" max="6"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.hasSink}
                      onChange={e => updateSection(s.id, 'hasSink', e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span className="text-xs text-slate-400">Sink</span>
                  </label>
                  {s.hasSink && (
                    <select
                      value={s.sinkSize}
                      onChange={e => updateSection(s.id, 'sinkSize', e.target.value)}
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-white text-xs focus:outline-none"
                    >
                      {SINK_SIZES.map(sz => <option key={sz}>{sz}</option>)}
                    </select>
                  )}
                  <span className="ml-auto text-xs text-amber-400 font-medium">
                    {(s.length * s.depth).toFixed(1)} sqft
                  </span>
                </div>
              </div>
            ))}

            {/* Live totals */}
            <div className="border-t border-slate-700 pt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-white">{totalSqft.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">Net sqft</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-400">{grossSqft}</div>
                <div className="text-[10px] text-slate-500">Gross (+15%)</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">{slabs}</div>
                <div className="text-[10px] text-slate-500">Slabs needed</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-4">
            <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. waterfall edge, mitered island, backsplash..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !sections.length}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⟳</span> Generating sketch...</>
            ) : (
              <>📐 Generate Sketch + Quote</>
            )}
          </button>

          {error && <div className="text-red-400 text-xs bg-red-500/10 rounded-lg p-3">{error}</div>}
        </div>

        {/* RIGHT: Output */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl h-64 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <div className="text-4xl mb-2">📐</div>
                <div className="text-sm">Sketch will appear here</div>
                <div className="text-xs mt-1">Fill in dimensions and click Generate</div>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl h-64 flex items-center justify-center">
              <div className="text-center text-amber-400">
                <div className="text-3xl mb-2 animate-pulse">⟳</div>
                <div className="text-sm">GPT-4o generating layout...</div>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* SVG Preview */}
              <div className="bg-[#1a1a2e] border border-amber-500/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                  <span className="text-sm font-medium text-white">Layout Preview</span>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadSVG}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-lg transition-colors"
                    >
                      ↓ SVG
                    </button>
                    <button
                      onClick={downloadPNG}
                      className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-lg transition-colors"
                    >
                      ↓ PNG
                    </button>
                  </div>
                </div>
                <div
                  className="w-full overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: result.svg }}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">{result.totalSqft}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Net sqft</div>
                </div>
                <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{result.grossSqft}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Gross sqft</div>
                </div>
                <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{result.slabs}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Slabs × MSI 130″×79″</div>
                </div>
              </div>

              {/* Pricing table */}
              {result.pricing.length > 0 && (
                <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700">
                    <h3 className="font-semibold text-white text-sm">💰 Stone Pricing Options</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Based on {result.grossSqft} sqft gross · from Neon price list</p>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {result.pricing.map((p, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.material}</div>
                        </div>
                        {p.dealer_cost && (
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Cost</div>
                            <div className="text-sm font-semibold text-slate-300">${p.dealer_cost}</div>
                          </div>
                        )}
                        {p.retail_price && (
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Retail</div>
                            <div className="text-sm font-bold text-green-400">${p.retail_price}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
