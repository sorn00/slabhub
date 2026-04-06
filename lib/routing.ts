import fs from 'fs'
import path from 'path'

export interface FabricatorMatch {
  fabricatorId: string
  name: string
  phone: string
  state: string
  distance?: number // miles from customer zip, if address available
}

// Zip code range → state abbreviation
const ZIP_STATE_RANGES = [
  { state: 'CT', min: 6001, max: 6928 },
  { state: 'NY', min: 10001, max: 14975 },
  { state: 'FL', min: 32004, max: 34997 },
  { state: 'GA', min: 30001, max: 31999 },
  { state: 'TX', min: 75001, max: 79999 },
  { state: 'CA', min: 90001, max: 96162 },
  { state: 'MA', min: 1001, max: 2791 },
  { state: 'NJ', min: 7001, max: 8989 },
  { state: 'PA', min: 15001, max: 19640 },
  { state: 'RI', min: 2801, max: 2940 },
]

// Map state abbreviation to lowercase full name used in fabricator JSON files
const STATE_ABBR_TO_FULL: Record<string, string> = {
  CT: 'connecticut',
  NY: 'new_york',
  FL: 'florida',
  GA: 'georgia',
  TX: 'texas',
  CA: 'california',
  MA: 'massachusetts',
  NJ: 'new_jersey',
  PA: 'pennsylvania',
  RI: 'rhode_island',
}

// Map state abbreviation to full readable name for display
const STATE_ABBR_TO_DISPLAY: Record<string, string> = {
  CT: 'Connecticut',
  NY: 'New York',
  FL: 'Florida',
  GA: 'Georgia',
  TX: 'Texas',
  CA: 'California',
  MA: 'Massachusetts',
  NJ: 'New Jersey',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
}

export function getStateFromZip(zip: string): string | null {
  const num = parseInt(zip.replace(/\D/g, ''), 10)
  if (isNaN(num)) return null
  for (const range of ZIP_STATE_RANGES) {
    if (num >= range.min && num <= range.max) {
      return range.state
    }
  }
  return null
}

export function getStateDisplayName(abbr: string): string {
  return STATE_ABBR_TO_DISPLAY[abbr] || abbr
}

const GHL_FABRICATOR_DIR = '/Users/sorn/.openclaw/workspace/agents/ghl'

export function loadFabricators(): any[] {
  const fabricators: any[] = []

  // Load all fabricators-*.json files
  try {
    const files = fs.readdirSync(GHL_FABRICATOR_DIR)
    for (const file of files) {
      if (file.startsWith('fabricators-') && file.endsWith('.json')) {
        const filePath = path.join(GHL_FABRICATOR_DIR, file)
        try {
          const raw = fs.readFileSync(filePath, 'utf-8')
          const data = JSON.parse(raw)
          if (Array.isArray(data)) {
            fabricators.push(...data)
          }
        } catch {
          // skip bad files
        }
      }
    }
  } catch {
    // directory not readable
  }

  // Also load ct-fabricators.json (Connecticut, no state field)
  try {
    const ctPath = path.join(GHL_FABRICATOR_DIR, 'ct-fabricators.json')
    if (fs.existsSync(ctPath)) {
      const raw = fs.readFileSync(ctPath, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data)) {
        // Inject state if missing
        const withState = data.map((f: any) => ({ ...f, state: f.state || 'connecticut' }))
        fabricators.push(...withState)
      }
    }
  } catch {
    // skip
  }

  return fabricators
}

export async function matchFabricator(customerZip: string): Promise<FabricatorMatch | null> {
  const stateAbbr = getStateFromZip(customerZip)
  if (!stateAbbr) return null

  const stateFull = STATE_ABBR_TO_FULL[stateAbbr]
  if (!stateFull) return null

  const fabricators = loadFabricators()

  // Find fabricators matching the state (case-insensitive, handles "new_york" and "New York" etc.)
  const matches = fabricators.filter((f: any) => {
    if (!f.state) return false
    const fs = f.state.toLowerCase().replace(/[\s-]/g, '_')
    return fs === stateFull
  })

  if (matches.length === 0) return null

  // Pick first match (future: pick closest by distance)
  const best = matches[0]

  return {
    fabricatorId: `${stateAbbr}_${best.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
    name: best.name,
    phone: best.phone,
    state: stateAbbr,
  }
}
