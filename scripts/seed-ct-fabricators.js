const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_JW5ns7puXzoN@ep-silent-feather-anpv5jzh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

function toSlug(companyName, city, stateCode) {
  const namePart = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const cityPart = (city || 'ct')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  const sc = (stateCode || 'ct').toLowerCase()
  return `${namePart}-${cityPart}-${sc}`
}

async function main() {
  // Load both files
  const enriched = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../agents/ghl/ct-fabricators-msi-enriched.json'), 'utf8'
  ))
  const allFabs = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../agents/ghl/ct-fabricators.json'), 'utf8'
  ))

  // Filter CT from the main file
  const ctFabs = allFabs.filter(f => f.state === 'CT')

  // Build enrichment lookup by company name
  const enrichedMap = {}
  for (const e of enriched) {
    enrichedMap[e.company_name.toLowerCase().trim()] = e
  }

  console.log(`CT fabricators from main file: ${ctFabs.length}`)
  console.log(`Enriched records: ${enriched.length}`)

  // Merge: use enriched data to augment ct fabs
  // Also include enriched records not in ctFabs
  const seen = new Set()
  const toInsert = []

  for (const fab of ctFabs) {
    const key = fab.company_name.toLowerCase().trim()
    seen.add(key)
    const enr = enrichedMap[key]
    const city = (fab.city && fab.city !== 'Connecticut') ? fab.city : (enr?.city || 'Connecticut')
    const msiConfirmed = enr?.msi_buyer === 'confirmed'

    toInsert.push({
      slug: toSlug(fab.company_name, city, 'CT'),
      company_name: fab.company_name,
      city,
      state: 'Connecticut',
      state_code: 'CT',
      phone: fab.phone || enr?.phone || null,
      website: fab.website || enr?.website || null,
      msi_confirmed: msiConfirmed,
      services: ['quartz', 'granite', 'marble'],
      brands: msiConfirmed ? ['MSI'] : []
    })
  }

  // Add enriched records not in main file
  for (const enr of enriched) {
    const key = enr.company_name.toLowerCase().trim()
    if (!seen.has(key)) {
      const city = (enr.city && enr.city !== 'Connecticut') ? enr.city : 'Connecticut'
      const msiConfirmed = enr.msi_buyer === 'confirmed'
      toInsert.push({
        slug: toSlug(enr.company_name, city, 'CT'),
        company_name: enr.company_name,
        city,
        state: 'Connecticut',
        state_code: 'CT',
        phone: enr.phone || null,
        website: enr.website || null,
        msi_confirmed: msiConfirmed,
        services: ['quartz', 'granite', 'marble'],
        brands: msiConfirmed ? ['MSI'] : []
      })
    }
  }

  console.log(`Total to insert: ${toInsert.length}`)

  let inserted = 0
  let skipped = 0

  for (const fab of toInsert) {
    try {
      const res = await pool.query(`
        INSERT INTO directory_fabricators 
          (slug, company_name, city, state, state_code, phone, website, msi_confirmed, services, brands, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `, [
        fab.slug,
        fab.company_name,
        fab.city,
        fab.state,
        fab.state_code,
        fab.phone,
        fab.website,
        fab.msi_confirmed,
        fab.services,
        fab.brands
      ])
      if (res.rows.length > 0) {
        inserted++
      } else {
        skipped++
      }
    } catch (e) {
      console.error(`Error inserting ${fab.company_name}:`, e.message)
    }
  }

  console.log(`Inserted: ${inserted}, Skipped (duplicates): ${skipped}`)

  // Read-back verify
  const countRes = await pool.query('SELECT COUNT(*) FROM directory_fabricators WHERE state_code=$1', ['CT'])
  console.log(`Read-back count in DB for CT: ${countRes.rows[0].count}`)

  // Sample
  const sample = await pool.query('SELECT slug, company_name, city, msi_confirmed FROM directory_fabricators WHERE state_code=$1 LIMIT 5', ['CT'])
  console.log('Sample rows:')
  for (const row of sample.rows) {
    console.log(`  ${row.slug} | ${row.company_name} | ${row.city} | MSI: ${row.msi_confirmed}`)
  }

  await pool.end()
  console.log('DONE')
}

main().catch(err => { console.error(err); process.exit(1) })
