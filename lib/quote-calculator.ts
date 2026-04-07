export interface StonePriceRow {
  id?: number
  stone_id: string
  stone_name: string
  material?: string | null
  dealer_cost_sqft?: number | null
  retail_sqft?: number | null
  slab_width_inches?: number | null
  slab_height_inches?: number | null
  notes?: string | null
  updated_at?: string | null
  updated_by?: string | null
}

export interface QuoteInput {
  stoneId: string
  sqftCountertop: number
  sqftSplash?: number      // default 8.7
  slabs: number            // how many slabs needed
  sinkType?: 'single' | 'double' | 'none'  // all $0 (included)
  edgeProfile?: string     // eased = $0
}

export interface QuoteResult {
  stoneId: string
  stoneName: string
  slabs: number
  slabSqft: number
  slabCostPerSqft: number
  slabTotal: number
  fabSqft: number
  fabCostPerSqft: number   // always $30
  fabTotal: number
  total: number
  breakdown: string[]
}

const FAB_RATE = 30 // $/sqft, never changes

export function calculateQuote(input: QuoteInput, stonePrice: StonePriceRow): QuoteResult {
  const sqftSplash = input.sqftSplash ?? 8.7
  const slabWidth = stonePrice.slab_width_inches ?? 130
  const slabHeight = stonePrice.slab_height_inches ?? 79
  const retailSqft = stonePrice.retail_sqft ?? 0

  // Slab area in sqft
  const slabSqft = (slabWidth * slabHeight) / 144

  // Slab cost
  const slabTotal = input.slabs * slabSqft * retailSqft

  // Fabrication cost
  const fabSqft = input.sqftCountertop + sqftSplash
  const fabTotal = fabSqft * FAB_RATE

  const total = slabTotal + fabTotal

  const breakdown: string[] = [
    `Stone: ${input.slabs} slab${input.slabs !== 1 ? 's' : ''} × ${slabSqft.toFixed(2)} sqft × $${retailSqft.toFixed(2)}/sqft = $${slabTotal.toFixed(2)}`,
    `Fabrication: ${fabSqft.toFixed(2)} sqft × $${FAB_RATE}/sqft = $${fabTotal.toFixed(2)}`,
    `Total: $${total.toFixed(2)}`,
  ]

  if (input.sinkType && input.sinkType !== 'none') {
    breakdown.push(`Sink cutout (${input.sinkType}): $0 (included)`)
  }
  if (input.edgeProfile) {
    breakdown.push(`Edge profile (${input.edgeProfile}): $0 (included)`)
  }

  return {
    stoneId: input.stoneId,
    stoneName: stonePrice.stone_name,
    slabs: input.slabs,
    slabSqft,
    slabCostPerSqft: retailSqft,
    slabTotal,
    fabSqft,
    fabCostPerSqft: FAB_RATE,
    fabTotal,
    total,
    breakdown,
  }
}
