#!/usr/bin/env node
// Test zip routing — CommonJS version for direct node execution
const fs = require('fs')
const path = require('path')

// ---- Inline routing logic (mirrors routing.ts) ----

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

const STATE_ABBR_TO_FULL = {
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

const STATE_ABBR_TO_DISPLAY = {
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

function getStateFromZip(zip) {
  const num = parseInt(zip.replace(/\D/g, ''), 10)
  if (isNaN(num)) return null
  for (const range of ZIP_STATE_RANGES) {
    if (num >= range.min && num <= range.max) return range.state
  }
  return null
}

const GHL_DIR = '/Users/sorn/.openclaw/workspace/agents/ghl'

function loadFabricators() {
  const fabricators = []
  try {
    const files = fs.readdirSync(GHL_DIR)
    for (const file of files) {
      if (file.startsWith('fabricators-') && file.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(GHL_DIR, file), 'utf-8'))
          if (Array.isArray(data)) fabricators.push(...data)
        } catch {}
      }
    }
  } catch {}

  // ct-fabricators.json
  try {
    const ctPath = path.join(GHL_DIR, 'ct-fabricators.json')
    if (fs.existsSync(ctPath)) {
      const data = JSON.parse(fs.readFileSync(ctPath, 'utf-8'))
      if (Array.isArray(data)) {
        fabricators.push(...data.map(f => ({ ...f, state: f.state || 'connecticut' })))
      }
    }
  } catch {}

  return fabricators
}

function matchFabricator(zip) {
  const stateAbbr = getStateFromZip(zip)
  if (!stateAbbr) return null

  const stateFull = STATE_ABBR_TO_FULL[stateAbbr]
  if (!stateFull) return null

  const fabricators = loadFabricators()
  const matches = fabricators.filter(f => {
    if (!f.state) return false
    return f.state.toLowerCase().replace(/[\s-]/g, '_') === stateFull
  })

  if (matches.length === 0) return null
  const best = matches[0]
  return {
    fabricatorId: `${stateAbbr}_${best.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
    name: best.name,
    phone: best.phone,
    state: stateAbbr,
    stateDisplay: STATE_ABBR_TO_DISPLAY[stateAbbr],
    totalMatches: matches.length,
  }
}

// ---- Run tests ----

const testZips = ['06001', '10001', '33101', '30301', '75001', '90001', '02101']

console.log('\n🔍 SlabHub Zip Routing Test\n')
console.log('ZIP\t\tSTATE\t\tFABRICATOR\t\t\t\t\tPHONE')
console.log('─'.repeat(90))

for (const zip of testZips) {
  const state = getStateFromZip(zip)
  const match = matchFabricator(zip)
  const stateDisplay = state ? (STATE_ABBR_TO_DISPLAY[state] || state) : '— unserved —'
  const fabName = match ? match.name : '— no fabricator —'
  const fabPhone = match ? match.phone : ''
  const totalNote = match ? `(${match.totalMatches} in state)` : ''
  console.log(`${zip}\t\t${stateDisplay.padEnd(16)}\t${fabName.padEnd(40)}\t${fabPhone} ${totalNote}`)
}

console.log('\n✅ Test complete\n')
