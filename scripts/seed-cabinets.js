// scripts/seed-cabinets.js
// Run: node scripts/seed-cabinets.js
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  console.log('🔧 Migrating cabinets table...')
  await pool.query(`
    ALTER TABLE cabinets
      ADD COLUMN IF NOT EXISTS category      VARCHAR(100),
      ADD COLUMN IF NOT EXISTS subcategory   VARCHAR(100),
      ADD COLUMN IF NOT EXISTS width_inches  INTEGER,
      ADD COLUMN IF NOT EXISTS height_inches INTEGER,
      ADD COLUMN IF NOT EXISTS depth_inches  INTEGER,
      ADD COLUMN IF NOT EXISTS finish_tier   VARCHAR(50),
      ADD COLUMN IF NOT EXISTS door_style    VARCHAR(100),
      ADD COLUMN IF NOT EXISTS finish_color  VARCHAR(100),
      ADD COLUMN IF NOT EXISTS finish_code   VARCHAR(20),
      ADD COLUMN IF NOT EXISTS features      TEXT
  `)
  console.log('✅ cabinets table migrated')

  // ── cabinet_door_styles ──────────────────────────────────────────────────
  console.log('🔧 Creating cabinet_door_styles...')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cabinet_door_styles (
      id             SERIAL PRIMARY KEY,
      code           VARCHAR(20)  NOT NULL,
      name           VARCHAR(100) NOT NULL,
      style_category VARCHAR(50),
      description    TEXT,
      tier_number    INTEGER,
      tier_name      VARCHAR(50)
    )
  `)

  await pool.query('DELETE FROM cabinet_door_styles')

  const doorStyles = [
    // Tier 1 — Value
    { code: 'K8', name: 'Espresso',      style_category: 'Transitional', tier_number: 1, tier_name: 'Value',   description: 'Rich espresso finish with clean transitional lines' },
    { code: 'K3', name: 'Greige',        style_category: 'Transitional', tier_number: 1, tier_name: 'Value',   description: 'Warm grey-beige blend, endlessly versatile' },
    // Tier 2 — Classic
    { code: 'S8', name: 'White',         style_category: 'Contemporary', tier_number: 2, tier_name: 'Classic', description: 'Crisp white with contemporary flat panel profile' },
    { code: 'S5', name: 'Castle Grey',   style_category: 'Contemporary', tier_number: 2, tier_name: 'Classic', description: 'Sophisticated grey with a modern edge' },
    { code: 'A7', name: 'Crème Glazed',  style_category: 'Traditional',  tier_number: 2, tier_name: 'Classic', description: 'Warm crème with antique glaze detailing' },
    { code: 'S1', name: 'Java Coffee',   style_category: 'Traditional',  tier_number: 2, tier_name: 'Classic', description: 'Deep coffee tone, bold traditional character' },
    { code: 'S2', name: 'Almond',        style_category: 'Traditional',  tier_number: 2, tier_name: 'Classic', description: 'Soft almond hue, timeless and warm' },
    // Tier 3 — Premium
    { code: 'H8', name: 'Hazel',         style_category: 'Transitional', tier_number: 3, tier_name: 'Premium', description: 'Warm hazel wood tone, sophisticated and livable' },
    { code: 'H9', name: 'Pearl Glazed',  style_category: 'Transitional', tier_number: 3, tier_name: 'Premium', description: 'Soft pearl finish with elegant glaze highlights' },
    { code: 'B5', name: 'Pure',          style_category: 'Traditional',  tier_number: 3, tier_name: 'Premium', description: 'Bright pure white with premium raised panel detail' },
    { code: 'B6', name: 'Pebble',        style_category: 'Traditional',  tier_number: 3, tier_name: 'Premium', description: 'Natural pebble grey, earthy and refined' },
    { code: 'B7', name: 'Naval',         style_category: 'Traditional',  tier_number: 3, tier_name: 'Premium', description: 'Deep navy, dramatic and timeless' },
    { code: 'B8', name: 'Butterscotch',  style_category: 'Traditional',  tier_number: 3, tier_name: 'Premium', description: 'Warm golden butterscotch, rich and inviting' },
    // Tier 4 — Elite
    { code: 'E1', name: 'Dove',          style_category: 'Modern',       tier_number: 4, tier_name: 'Elite',   description: 'Soft dove grey, frameless Euro-style construction' },
    { code: 'E2', name: 'Charcoal',      style_category: 'Modern',       tier_number: 4, tier_name: 'Elite',   description: 'Deep charcoal with seamless modern geometry' },
    { code: 'E3', name: 'Sage',          style_category: 'Modern',       tier_number: 4, tier_name: 'Elite',   description: 'Muted sage green, the designer\'s current obsession' },
  ]

  for (const s of doorStyles) {
    await pool.query(
      `INSERT INTO cabinet_door_styles (code, name, style_category, description, tier_number, tier_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.code, s.name, s.style_category, s.description, s.tier_number, s.tier_name]
    )
  }
  console.log(`✅ ${doorStyles.length} door styles seeded`)

  // ── cabinet_quote_requests ────────────────────────────────────────────────
  console.log('🔧 Creating cabinet_quote_requests...')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cabinet_quote_requests (
      id                  SERIAL PRIMARY KEY,
      name                VARCHAR(255) NOT NULL,
      email               VARCHAR(255) NOT NULL,
      phone               VARCHAR(50),
      city                VARCHAR(100),
      state               VARCHAR(50),
      project_type        VARCHAR(50),
      cabinet_styles      TEXT,
      preferred_tier      VARCHAR(50),
      room_count          INTEGER DEFAULT 1,
      timeline            VARCHAR(50),
      notes               TEXT,
      cabinet_selections  JSONB,
      status              VARCHAR(30) DEFAULT 'new',
      created_at          TIMESTAMP DEFAULT NOW()
    )
  `)
  // Add cabinet_selections column if table already existed
  await pool.query(`
    ALTER TABLE cabinet_quote_requests
      ADD COLUMN IF NOT EXISTS cabinet_selections JSONB,
      ADD COLUMN IF NOT EXISTS preferred_tier     VARCHAR(50)
  `)
  console.log('✅ cabinet_quote_requests ready')

  // ── Cabinet SKUs ─────────────────────────────────────────────────────────
  console.log('🔧 Seeding cabinet SKUs...')

  const H = 34.5 // standard base height
  const D = 24   // standard base depth

  const cabinets = [
    // ── Base Cabinets ──────────────────────────────────────────────────────
    ...([9,12,15,18,21,24,27,30,33,36,42].map(w => ({
      sku: `B${String(w).padStart(2,'0')}`,
      name: `Base Cabinet ${w}"`,
      category: 'base_cabinet', subcategory: 'base',
      width_inches: w, height_inches: H, depth_inches: D,
    }))),

    // ── Drawer Base — 3 drawer ─────────────────────────────────────────────
    ...([12,15,18,21,24,30,36].map(w => ({
      sku: `DB${String(w).padStart(2,'0')}-3`,
      name: `3-Drawer Base Cabinet ${w}"`,
      category: 'base_cabinet', subcategory: 'drawer_base',
      width_inches: w, height_inches: H, depth_inches: D,
    }))),

    // ── Drawer Base — 2 drawer ─────────────────────────────────────────────
    ...([24,30,36].map(w => ({
      sku: `DB${w}-2`,
      name: `2-Drawer Base Cabinet ${w}"`,
      category: 'base_cabinet', subcategory: 'drawer_base',
      width_inches: w, height_inches: H, depth_inches: D,
    }))),

    // ── Microwave Drawer Base ──────────────────────────────────────────────
    { sku: 'MDB24', name: 'Microwave Drawer Base 24"', category: 'base_cabinet', subcategory: 'microwave_base', width_inches: 24, height_inches: H, depth_inches: D },
    { sku: 'MDB30', name: 'Microwave Drawer Base 30"', category: 'base_cabinet', subcategory: 'microwave_base', width_inches: 30, height_inches: H, depth_inches: D },

    // ── Lazy Susan Corner Base ─────────────────────────────────────────────
    { sku: 'LS3309', name: 'Lazy Susan Corner Base 33"', category: 'base_cabinet', subcategory: 'lazy_susan', width_inches: 33, height_inches: H, depth_inches: D },
    { sku: 'LS3612', name: 'Lazy Susan Corner Base 36"', category: 'base_cabinet', subcategory: 'lazy_susan', width_inches: 36, height_inches: H, depth_inches: D },

    // ── Corner ────────────────────────────────────────────────────────────
    { sku: 'CBD36',  name: 'Base Diagonal Corner 36"', category: 'base_cabinet', subcategory: 'corner', width_inches: 36, height_inches: H, depth_inches: D },
    { sku: 'CSB36',  name: 'Corner Sink Base 36"',     category: 'base_cabinet', subcategory: 'corner', width_inches: 36, height_inches: H, depth_inches: D },

    // ── Blind Corner Base ─────────────────────────────────────────────────
    { sku: 'BBC39L', name: 'Blind Corner Base 39" Left',  category: 'base_cabinet', subcategory: 'blind_corner', width_inches: 39, height_inches: H, depth_inches: D },
    { sku: 'BBC39R', name: 'Blind Corner Base 39" Right', category: 'base_cabinet', subcategory: 'blind_corner', width_inches: 39, height_inches: H, depth_inches: D },
    { sku: 'BBC42L', name: 'Blind Corner Base 42" Left',  category: 'base_cabinet', subcategory: 'blind_corner', width_inches: 42, height_inches: H, depth_inches: D },
    { sku: 'BBC42R', name: 'Blind Corner Base 42" Right', category: 'base_cabinet', subcategory: 'blind_corner', width_inches: 42, height_inches: H, depth_inches: D },

    // ── Sink Base ────────────────────────────────────────────────────────
    ...([24,27,30,33,36,42].map(w => ({
      sku: `SB${w}`,
      name: `Sink Base ${w}"`,
      category: 'base_cabinet', subcategory: 'sink_base',
      width_inches: w, height_inches: H, depth_inches: D,
    }))),

    // ── Farm Sink Base ────────────────────────────────────────────────────
    ...([30,33,36].map(w => ({
      sku: `FSB${w}`,
      name: `Farm Sink Base ${w}"`,
      category: 'base_cabinet', subcategory: 'farm_sink',
      width_inches: w, height_inches: H, depth_inches: D,
    }))),

    // ── Specialty ─────────────────────────────────────────────────────────
    { sku: 'SP09',     name: 'Spice Pull-Out 9"',    category: 'base_cabinet', subcategory: 'specialty', width_inches: 9,  height_inches: H, depth_inches: D },
    { sku: 'BWRC6',    name: 'Spice Drawer Base',    category: 'base_cabinet', subcategory: 'specialty', width_inches: null, height_inches: H, depth_inches: D },
    { sku: 'BWBK18-2', name: 'Waste Basket Bin 18"', category: 'base_cabinet', subcategory: 'specialty', width_inches: 18, height_inches: H, depth_inches: D },

    // ── End Corner ────────────────────────────────────────────────────────
    { sku: 'BEC24',   name: 'Base End Corner 24"',              category: 'base_cabinet', subcategory: 'end_corner', width_inches: 24, height_inches: H, depth_inches: D },
    { sku: 'BDEC12L', name: 'Base Diagonal End Corner 12" Left', category: 'base_cabinet', subcategory: 'end_corner', width_inches: 12, height_inches: H, depth_inches: D },
    { sku: 'BDEC12R', name: 'Base Diagonal End Corner 12" Right',category: 'base_cabinet', subcategory: 'end_corner', width_inches: 12, height_inches: H, depth_inches: D },
    { sku: 'BES09L',  name: 'Base End Shelf 9" Left',           category: 'base_cabinet', subcategory: 'end_corner', width_inches: 9,  height_inches: H, depth_inches: D },
    { sku: 'BES09R',  name: 'Base End Shelf 9" Right',          category: 'base_cabinet', subcategory: 'end_corner', width_inches: 9,  height_inches: H, depth_inches: D },
  ]

  // Upsert each cabinet
  let inserted = 0, skipped = 0
  for (const c of cabinets) {
    try {
      await pool.query(
        `INSERT INTO cabinets (sku, name, category, subcategory, width_inches, height_inches, depth_inches, in_stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (sku) DO UPDATE SET
           name         = EXCLUDED.name,
           category     = EXCLUDED.category,
           subcategory  = EXCLUDED.subcategory,
           width_inches = EXCLUDED.width_inches,
           height_inches= EXCLUDED.height_inches,
           depth_inches = EXCLUDED.depth_inches`,
        [c.sku, c.name, c.category, c.subcategory, c.width_inches, c.height_inches, c.depth_inches]
      )
      inserted++
    } catch (e) {
      console.warn(`  ⚠ SKU ${c.sku}:`, e.message)
      skipped++
    }
  }
  console.log(`✅ ${inserted} cabinet SKUs seeded (${skipped} skipped)`)

  await pool.end()
  console.log('\n🎉 All done!')
}

main().catch(e => { console.error(e); pool.end(); process.exit(1) })
