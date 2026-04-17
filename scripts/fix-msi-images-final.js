#!/usr/bin/env node
/**
 * fix-msi-images-final.js
 * Handles the 18 remaining hard-to-match MSI stones with manually resolved URLs.
 */

const { Pool } = require('pg');
const https = require('https');

const DATABASE_URL = 'postgresql://neondb_owner:npg_JW5ns7puXzoN@ep-silent-feather-anpv5jzh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

const CDN = 'https://cdn.msisurfaces.com';
const Q   = `${CDN}/images/quartz-countertops/products/slab/large`;
const C   = `${CDN}/images/colornames`;

// Manually resolved image mappings: stone name (exact DB value) → CDN URL
const MANUAL_MAP = {
  // Quartzite stones
  'Blue Roma':       `${C}/blue-roma-quartz.jpg`,
  'Fusion':          `${C}/fusion-granite.jpg`,
  'MILANO':          `${C}/rsl-milano-2cm.jpg`,
  'Zermatt':         `${C}/zermat-quartzite.jpg`,

  // Quartz stones with ™ HTML entities (stored as &#8482 without semicolon)
  'Calacatta Aravine&#8482':         `${Q}/calacatta-aravine-q-premium-natural-quartz-countertops.jpg`,
  'Calacatta Jadira&#8482':          `${Q}/calacatta-jadira-q-premium-natural-quartz-countertops.jpg`,
  'Calacatta Rivessa&#8482':         `${Q}/calacatta-rivessa-q-premium-natural-quartz-countertops.jpg`,
  'Calacatta Vernello&#8482':        `${Q}/calacatta-vernello-quartz.jpg`,
  'Calacatta Miraggio Cielo Honed&#8482': `${Q}/calacatta-miraggio-cielo-quartz.jpg`,
  'Calacatta Miraggio Gold Honed&#8482':  `${Q}/calacatta-miraggio-gold-quartz.jpg`,
  'IvoriTaj &#8482':                 `${Q}/ivoritaj-polished-q-premium-natural-quartz-countertops.jpg`,
  'IvoriTaj Brushed&#8482':          `${Q}/ivoritaj-brushed-q-premium-natural-quartz-countertops.jpg`,
  'MarfiTaj&#8482':                  `${Q}/marfitaj-q-premium-natural-quartz-countertops.jpg`,
  'SoliTaj Brushed &#8482':          `${Q}/solitaj-brushed-quartz.jpg`,
  'Travataj&#8482':                  `${Q}/travataj-q-premium-natural-quartz-countertops.jpg`,

  // Quartz stones with naming mismatches
  'Calacatta Laza Gold':   `${Q}/new-calacatta-laza-gold-quartz.jpg`,
  'Calacatta Ocelio':      `${Q}/calacatta-ocellio-quartz.jpg`,  // double-l on CDN
  'Luma Taj':              `${Q}/lumataj-quartz.jpg`,
  'Mystic Grey':           `${Q}/mystic-gray-quartz.jpg`,        // MSI spells it "gray"
  'MOON WHITE 3CM SLABS POL': `${C}/moon-white-granite.jpg`,
  'SILVER CLOUD 3CM':      `${C}/silver-cloud-granite.jpg`,
};

function headRequest(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => resolve(res.statusCode));
    req.on('error', () => resolve(0));
    req.setTimeout(8000, () => { req.destroy(); resolve(0); });
    req.end();
  });
}

async function main() {
  // Query remaining missing stones
  const result = await pool.query(`
    SELECT id, name, material
    FROM stones
    WHERE brand = 'MSI' AND (image_url IS NULL OR image_url = '')
    ORDER BY name
  `);

  const stones = result.rows;
  console.log(`Remaining missing: ${stones.length} stones\n`);

  let updated = 0;
  const stillMissing = [];

  for (const stone of stones) {
    const imageUrl = MANUAL_MAP[stone.name];

    if (!imageUrl) {
      console.log(`  ⚠️  No mapping for: [${stone.material}] ${stone.name}`);
      stillMissing.push(`[${stone.material}] ${stone.name}`);
      continue;
    }

    process.stdout.write(`  ${stone.name} → `);
    const httpStatus = await headRequest(imageUrl);

    if (httpStatus === 200) {
      await pool.query(`UPDATE stones SET image_url = $1 WHERE id = $2`, [imageUrl, stone.id]);
      console.log(`✓ ${imageUrl.split('/').pop()}`);
      updated++;
    } else {
      console.log(`✗ HTTP ${httpStatus}: ${imageUrl}`);
      stillMissing.push(`[${stone.material}] ${stone.name}`);
    }
  }

  console.log('\n--- FINAL RESULTS ---');
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Still missing: ${stillMissing.length}`);
  if (stillMissing.length > 0) {
    console.log('\nRemaining:');
    stillMissing.forEach(n => console.log(`  - ${n}`));
  }

  await pool.end();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
