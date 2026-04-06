#!/usr/bin/env node
/**
 * MSI Stone Image Downloader
 * Downloads product images from msi-catalog.json to public/stones/
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CATALOG_FILE = path.join(__dirname, '../public/data/msi-catalog.json');
const IMAGES_DIR = path.join(__dirname, '../public/stones');
const RATE_LIMIT_MS = 300;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
  'Referer': 'https://www.msisurfaces.com/',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url, destPath) {
  const response = await axios.get(url, {
    headers: HEADERS,
    responseType: 'arraybuffer',
    timeout: 20000,
    maxRedirects: 5,
  });
  fs.writeFileSync(destPath, Buffer.from(response.data));
}

async function main() {
  if (!fs.existsSync(CATALOG_FILE)) {
    console.error('❌ msi-catalog.json not found. Run scrape-msi.js first.');
    process.exit(1);
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
  console.log(`📦 Found ${catalog.length} products in catalog\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < catalog.length; i++) {
    const stone = catalog[i];
    const destPath = path.join(IMAGES_DIR, `${stone.id}.jpg`);

    // Skip if already downloaded
    if (fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    // Skip if no image URL
    if (!stone.imageUrl) {
      console.log(`  [${i + 1}/${catalog.length}] ⚠️  No image URL for ${stone.name}`);
      failed++;
      continue;
    }

    console.log(`  [${i + 1}/${catalog.length}] ⬇️  ${stone.name}`);
    console.log(`         ${stone.imageUrl}`);

    await sleep(RATE_LIMIT_MS);

    try {
      await downloadImage(stone.imageUrl, destPath);
      downloaded++;
      const size = fs.statSync(destPath).size;
      console.log(`         ✓ Saved (${(size / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.log(`         ✗ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✓ Downloaded: ${downloaded}`);
  console.log(`   → Skipped (already exists): ${skipped}`);
  console.log(`   ✗ Failed: ${failed}`);
  console.log(`\n📁 Images saved to: ${IMAGES_DIR}`);
}

main().catch(console.error);
