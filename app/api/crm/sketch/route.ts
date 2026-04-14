import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Standard MSI slab: 130" x 79" = ~71.3 sqft gross, ~60 sqft usable (15% waste)
const SLAB_USABLE_SQFT = 60
const WASTE_FACTOR = 0.15

function calcSlabs(sqft: number) {
  const gross = sqft * (1 + WASTE_FACTOR)
  const slabs = Math.ceil(gross / SLAB_USABLE_SQFT)
  return { gross: Math.round(gross * 10) / 10, slabs }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { contactName, shape, sections, material, notes } = body

  // sections: [{ label: 'Main Run', length: 10, depth: 2, hasSink: true, sinkSize: '30x18' }, ...]
  if (!sections || !sections.length) {
    return NextResponse.json({ error: 'sections required' }, { status: 400 })
  }

  // Calculate total sqft
  const totalSqft = sections.reduce((sum: number, s: { length: number; depth: number }) =>
    sum + (s.length * s.depth), 0)
  const { gross, slabs } = calcSlabs(totalSqft)

  // Build section descriptions for GPT
  const sectionDesc = sections.map((s: { label: string; length: number; depth: number; hasSink?: boolean; sinkSize?: string }) =>
    `${s.label}: ${s.length}ft × ${s.depth}ft${s.hasSink ? ` (sink: ${s.sinkSize || '30"×18"'})` : ''}`
  ).join('\n')

  // Fetch matching stones from Neon
  const matFilter = material?.toLowerCase()
  const stones = await query(`
    SELECT stone_name, material, dealer_cost_sqft, retail_sqft
    FROM stone_prices
    WHERE dealer_cost_sqft IS NOT NULL
    ${matFilter && matFilter !== 'any' ? `AND LOWER(material) LIKE '%${matFilter.replace(/'/g, '')}%'` : ''}
    ORDER BY dealer_cost_sqft ASC
    LIMIT 6
  `)

  // Build pricing options
  const pricing = stones.map(s => {
    const dealer = s.dealer_cost_sqft ? (s.dealer_cost_sqft * gross).toFixed(0) : null
    const retail = s.retail_sqft ? (s.retail_sqft * gross).toFixed(0) : null
    return { name: s.stone_name, material: s.material, dealer_cost: dealer, retail_price: retail }
  })

  // Stone list for SVG prompt
  const stoneList = pricing.slice(0, 3).map(p => `${p.name} (~$${p.retail_price})`).join(', ')

  const svgPrompt = `Generate a precise, professional kitchen countertop layout SVG for a fabrication quote.

Contact: ${contactName || 'Customer'}
Shape: ${shape}
Sections:
${sectionDesc}
Material: ${material || 'Stone'}
Total: ${totalSqft} sqft net | ${gross} sqft gross (15% waste) | ${slabs} slab(s)
${notes ? `Notes: ${notes}` : ''}

SVG SPEC — follow exactly:
- <svg viewBox="0 0 640 520" width="640" height="520" xmlns="http://www.w3.org/2000/svg">
- Background: <rect width="640" height="520" fill="#0f172a"/>
- Title bar: rect y=0 h=40 fill="#1e293b", text "{contactName} — ${shape} Kitchen Layout" x=320 y=26 text-anchor="middle" fill="#f8fafc" font-size="14" font-family="monospace" font-weight="bold"
- Scale: 1 foot = 32px. Drawing origin at (80, 80).
- Draw countertop sections as rectangles: fill="#1e3a5f" stroke="#f59e0b" stroke-width="2.5" rx="2"
- Inside each section: label (e.g. "Main Run") fill="#fbbf24" font-size="10" font-family="monospace" font-weight="bold", centered
- Outside each section: dimension (e.g. "10'0\\"×2'0\\"") fill="#94a3b8" font-size="10" font-family="monospace"
- Always place dimension labels OUTSIDE the countertop, not overlapping
- Sink: rect inside countertop fill="#0f172a" stroke="#38bdf8" stroke-width="2", label "SINK" fill="#38bdf8" font-size="9" font-family="monospace" centered
- Wall lines: behind countertops, stroke="#475569" stroke-width="8" line/rect
- Info box at y=420 h=80: rect fill="#1e293b" stroke="#334155" width="640"
  Row 1 (y=440): "Net: ${totalSqft} sqft" fill="#94a3b8" | "Gross (+15%): ${gross} sqft" fill="#94a3b8" | "Slabs: ${slabs}×MSI 130\\"×79\\"" fill="#a78bfa" — all font-size="12" font-family="monospace"
  Row 2 (y=460): "Material: ${material || 'TBD'}" fill="#f59e0b" font-size="12" font-family="monospace"
  Row 3 (y=480): "Est. stones: ${stoneList || 'See pricing tab'}" fill="#34d399" font-size="11" font-family="monospace"
- Scale bar bottom-right (x=560 y=410): 64px line = 2ft, label "2 ft", fill="#64748b"
- N compass top-right (x=600 y=60): simple N with arrow, fill="#64748b"

Return ONLY valid SVG. No markdown, no explanation. Must start with <svg.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: svgPrompt }],
    max_tokens: 3500,
    temperature: 0.1,
  })

  let svg = completion.choices[0]?.message?.content?.trim() || ''
  if (svg.includes('```')) {
    const parts = svg.split('```')
    for (const p of parts) {
      const clean = p.startsWith('svg') ? p.slice(3) : p
      if (clean.trim().startsWith('<svg')) { svg = clean.trim(); break }
    }
  }

  return NextResponse.json({
    svg,
    totalSqft,
    grossSqft: gross,
    slabs,
    sections,
    pricing,
    material: material || 'any',
  })
}
