/**
 * setup-partner-markets.ts
 * Creates partner_markets and partner_applications tables, seeds initial data.
 * Run: npx ts-node --skip-project scripts/setup-partner-markets.ts
 */

import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_JW5ns7puXzoN@ep-silent-feather-anpv5jzh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const client = await pool.connect()
  try {
    console.log('Creating tables...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_markets (
        id SERIAL PRIMARY KEY,
        city_slug TEXT UNIQUE NOT NULL,
        city_name TEXT NOT NULL,
        state TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        partner_name TEXT,
        partner_id TEXT,
        claimed_at TIMESTAMPTZ,
        leads_last_30d INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_applications (
        id SERIAL PRIMARY KEY,
        city_slug TEXT NOT NULL,
        company_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        website TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    console.log('Tables created.')

    // MA cities
    const maCities = [
      ['boston-ma', 'Boston', 'MA'],
      ['worcester-ma', 'Worcester', 'MA'],
      ['springfield-ma', 'Springfield', 'MA'],
      ['cambridge-ma', 'Cambridge', 'MA'],
      ['lowell-ma', 'Lowell', 'MA'],
      ['framingham-ma', 'Framingham', 'MA'],
      ['newton-ma', 'Newton', 'MA'],
      ['brookline-ma', 'Brookline', 'MA'],
      ['quincy-ma', 'Quincy', 'MA'],
      ['natick-ma', 'Natick', 'MA'],
      ['needham-ma', 'Needham', 'MA'],
      ['wellesley-ma', 'Wellesley', 'MA'],
      ['lexington-ma', 'Lexington', 'MA'],
      ['concord-ma', 'Concord', 'MA'],
      ['weston-ma', 'Weston', 'MA'],
      ['wayland-ma', 'Wayland', 'MA'],
      ['westport-ma', 'Westport', 'MA'],
      ['norwood-ma', 'Norwood', 'MA'],
      ['dedham-ma', 'Dedham', 'MA'],
      ['braintree-ma', 'Braintree', 'MA'],
      ['weymouth-ma', 'Weymouth', 'MA'],
      ['hingham-ma', 'Hingham', 'MA'],
      ['plymouth-ma', 'Plymouth', 'MA'],
      ['barnstable-ma', 'Barnstable', 'MA'],
    ]

    // CT cities (deduped)
    const ctCities = [
      ['greenwich-ct', 'Greenwich', 'CT'],
      ['westport-ct', 'Westport', 'CT'],
      ['darien-ct', 'Darien', 'CT'],
      ['new-canaan-ct', 'New Canaan', 'CT'],
      ['wilton-ct', 'Wilton', 'CT'],
      ['stamford-ct', 'Stamford', 'CT'],
      ['fairfield-ct', 'Fairfield', 'CT'],
      ['ridgefield-ct', 'Ridgefield', 'CT'],
      ['hartford-ct', 'Hartford', 'CT'],
      ['west-hartford-ct', 'West Hartford', 'CT'],
      ['glastonbury-ct', 'Glastonbury', 'CT'],
      ['simsbury-ct', 'Simsbury', 'CT'],
      ['farmington-ct', 'Farmington', 'CT'],
      ['avon-ct', 'Avon', 'CT'],
    ]

    const allCities = [...maCities, ...ctCities]
    let seeded = 0

    for (const [slug, name, state] of allCities) {
      const leads = Math.floor(Math.random() * (45 - 8 + 1)) + 8
      try {
        await client.query(
          `INSERT INTO partner_markets (city_slug, city_name, state, status, leads_last_30d)
           VALUES ($1, $2, $3, 'available', $4)
           ON CONFLICT (city_slug) DO NOTHING`,
          [slug, name, state, leads]
        )
        seeded++
      } catch (e) {
        console.error(`Failed to insert ${slug}:`, e)
      }
    }

    console.log(`Seeded ${seeded} markets.`)

    // Mark claimed markets for social proof
    await client.query(`
      UPDATE partner_markets
      SET status = 'claimed',
          partner_name = 'Arts Marble & Granite',
          claimed_at = NOW() - INTERVAL '12 days'
      WHERE city_slug = 'framingham-ma'
    `)

    await client.query(`
      UPDATE partner_markets
      SET status = 'claimed',
          partner_name = 'Premier Stone Works',
          claimed_at = NOW() - INTERVAL '5 days'
      WHERE city_slug = 'norwood-ma'
    `)

    console.log('Marked framingham-ma and norwood-ma as claimed.')
    console.log('✅ Done! Total markets seeded:', seeded)

  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
