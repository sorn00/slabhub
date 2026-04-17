#!/usr/bin/env node
/**
 * fix-msi-images-v2.js
 * 
 * CDN patterns discovered:
 * - Quartz:     https://cdn.msisurfaces.com/images/quartz-countertops/products/slab/large/{slug}-quartz.jpg
 * - Granite:    https://cdn.msisurfaces.com/images/colornames/{slug}-granite.jpg
 * - Quartzite:  https://cdn.msisurfaces.com/images/colornames/{slug}-quartzite.jpg
 * - Marble:     https://cdn.msisurfaces.com/images/colornames/{slug}-marble.jpg
 */

const { Pool } = require('pg');
const https = require('https');

const DATABASE_URL = 'postgresql://neondb_owner:npg_JW5ns7puXzoN@ep-silent-feather-anpv5jzh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

// Product-spec keywords to strip from names like "CALACATTA ADONIA 3CM CLASSIC POLISHED"
const STRIP_PATTERNS = [
  /\s+\d+(?:\.\d+)?CM\b.*/i,     // "3CM ..." onwards
  /\s+(?:CLASSIC|POLISHED|HONED|MATTE|BRUSHED|LAPPED)\s*(?:POLISHED|HONED|MATTE|BKMATCH|BOOKMATCH|CLASSIC|QZ|QRTZ|SLABS?|POL|CL)?.*/i,
  /\s+QZ\b.*/i,
  /\s+QUARTZ\s+POLISHED.*/i,
  /\s+POLISHED.*/i,
  /&#\d+;/g,   // HTML entities like &#8482; (™)
  /™/g,
  /®/g,
  /\s+SLABS?\s+POL.*/i,
];

function cleanName(name) {
  let cleaned = name;
  for (const pat of STRIP_PATTERNS) {
    cleaned = cleaned.replace(pat, '');
  }
  return cleaned.trim();
}

function toSlug(name) {
  return cleanName(name)
    .toLowerCase()
    .replace(/['']/g, '')           // remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '')  // remove special chars
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing
}

function headRequest(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => resolve(res.statusCode));
    req.on('error', () => resolve(0));
    req.setTimeout(8000, () => { req.destroy(); resolve(0); });
    req.end();
  });
}

const QUARTZ_CDN = 'https://cdn.msisurfaces.com/images/quartz-countertops/products/slab/large';
const COLOR_CDN  = 'https://cdn.msisurfaces.com/images/colornames';

async function findImageUrl(name, material) {
  const mat = (material || '').toLowerCase().trim();
  const slug = toSlug(name);

  let candidates = [];

  if (mat === 'quartz') {
    // Primary: quartz-countertops CDN with -quartz suffix
    candidates.push(`${QUARTZ_CDN}/${slug}-quartz.jpg`);
    // Also try colornames with -quartz suffix (older products)
    candidates.push(`${COLOR_CDN}/${slug}-quartz.jpg`);
    // Try without material suffix (some older quartz)
    candidates.push(`${COLOR_CDN}/${slug}.jpg`);
    // Handle "Book Matched" stones — try without "book-matched" part
    if (slug.includes('-book-matched')) {
      const baseSlug = slug.replace('-book-matched', '');
      candidates.push(`${QUARTZ_CDN}/${baseSlug}-quartz.jpg`);
    }
    // Try "classique" -> "classique-book-matched"
    if (slug.includes('classique')) {
      candidates.push(`${QUARTZ_CDN}/${slug}-book-matched-quartz.jpg`);
    }

  } else if (mat === 'granite') {
    candidates.push(`${COLOR_CDN}/${slug}-granite.jpg`);
    // Also try without material suffix
    candidates.push(`${COLOR_CDN}/${slug}.jpg`);

  } else if (mat === 'quartzite') {
    candidates.push(`${COLOR_CDN}/${slug}-quartzite.jpg`);
    candidates.push(`${COLOR_CDN}/${slug}.jpg`);
    // Quartzite naming: "taj-mahal-quartzite" → "taj-mahal" (capitalize)
    candidates.push(`${COLOR_CDN}/${slug}-quartzite.jpg`.replace('-quartzite', '-Quartzite'));

  } else if (mat === 'marble') {
    candidates.push(`${COLOR_CDN}/${slug}-marble.jpg`);
    candidates.push(`${COLOR_CDN}/${slug}.jpg`);
  } else {
    // Unknown — try all
    candidates.push(`${QUARTZ_CDN}/${slug}-quartz.jpg`);
    candidates.push(`${COLOR_CDN}/${slug}-granite.jpg`);
    candidates.push(`${COLOR_CDN}/${slug}-quartzite.jpg`);
    candidates.push(`${COLOR_CDN}/${slug}.jpg`);
  }

  // Deduplicate
  candidates = [...new Set(candidates)];

  for (const url of candidates) {
    const status = await headRequest(url);
    if (status === 200) return url;
  }

  return null;
}

async function main() {
  console.log('Connecting to Neon DB...');

  const result = await pool.query(`
    SELECT id, name, brand, material
    FROM stones
    WHERE brand = 'MSI' AND (image_url IS NULL OR image_url = '')
    ORDER BY material, name
  `);

  const stones = result.rows;
  console.log(`Found ${stones.length} MSI stones with missing images.\n`);

  if (!stones.length) {
    console.log('Nothing to do!');
    await pool.end();
    return;
  }

  let updated = 0;
  const missing = [];

  for (const stone of stones) {
    const slug = toSlug(stone.name);
    process.stdout.write(`  [${stone.material}] ${stone.name} → ${slug} ... `);
    const imageUrl = await findImageUrl(stone.name, stone.material);

    if (imageUrl) {
      await pool.query(`UPDATE stones SET image_url = $1 WHERE id = $2`, [imageUrl, stone.id]);
      console.log(`✓ ${imageUrl.split('/').pop()}`);
      updated++;
    } else {
      console.log('✗ not found');
      missing.push(`[${stone.material}] ${stone.name}`);
    }
  }

  console.log('\n--- RESULTS ---');
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Still missing: ${missing.length}`);
  if (missing.length > 0) {
    console.log('\nMissing stones:');
    missing.forEach(n => console.log(`  - ${n}`));
  }

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
