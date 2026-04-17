#!/usr/bin/env node
/**
 * fix-msi-images.js
 * Scrapes missing image URLs for MSI stones from msisurfaces.com CDN
 */

const { Pool } = require('pg');
const https = require('https');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_JW5ns7puXzoN@ep-silent-feather-anpv5jzh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

const CDN_BASE = 'https://cdn.msisurfaces.com/images/colornames/';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

function headRequest(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.setTimeout(8000, () => { req.destroy(); resolve(0); });
    req.end();
  });
}

function nameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/'/g, '')       // remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .trim()
    .replace(/\s+/g, '-');   // spaces to hyphens
}

async function findImageUrl(name) {
  const slug = nameToSlug(name);
  
  // Try .jpg first
  const jpgUrl = `${CDN_BASE}${slug}.jpg`;
  const jpgStatus = await headRequest(jpgUrl);
  if (jpgStatus === 200) return jpgUrl;
  
  // Try .png
  const pngUrl = `${CDN_BASE}${slug}.png`;
  const pngStatus = await headRequest(pngUrl);
  if (pngStatus === 200) return pngUrl;
  
  // Try with extra cleanup (remove numbers, etc.)
  const slugClean = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (slugClean !== slug) {
    const cleanJpg = `${CDN_BASE}${slugClean}.jpg`;
    const cleanStatus = await headRequest(cleanJpg);
    if (cleanStatus === 200) return cleanJpg;
  }

  return null;
}

async function main() {
  console.log('Connecting to Neon DB...');
  
  // Query missing MSI stones
  const result = await pool.query(`
    SELECT id, name, brand 
    FROM stones 
    WHERE brand = 'MSI' AND (image_url IS NULL OR image_url = '')
    ORDER BY name
  `);
  
  const stones = result.rows;
  console.log(`Found ${stones.length} MSI stones with missing images.\n`);
  
  if (stones.length === 0) {
    console.log('Nothing to do!');
    await pool.end();
    return;
  }

  let updated = 0;
  let missing = [];

  for (const stone of stones) {
    process.stdout.write(`  Checking: ${stone.name} ... `);
    const imageUrl = await findImageUrl(stone.name);
    
    if (imageUrl) {
      await pool.query(
        `UPDATE stones SET image_url = $1 WHERE id = $2`,
        [imageUrl, stone.id]
      );
      console.log(`✓ ${imageUrl.split('/').pop()}`);
      updated++;
    } else {
      console.log(`✗ not found`);
      missing.push(stone.name);
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
