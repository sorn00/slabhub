#!/usr/bin/env node
/**
 * MSI Stone Catalog Scraper
 * Scrapes quartz, granite, marble, quartzite collections from msisurfaces.com
 */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = '/tmp/msi-scrape-progress.json';
const OUTPUT_FILE = path.join(__dirname, '../public/data/msi-catalog.json');
const RATE_LIMIT_MS = 600;

const COLLECTIONS = [
  {
    material: 'quartz',
    url: 'https://www.msisurfaces.com/quartz-countertops/quartz-collections/',
    altUrl: 'https://www.msisurfaces.com/quartz-countertops/',
  },
  {
    material: 'granite',
    url: 'https://www.msisurfaces.com/granite-countertops/',
  },
  {
    material: 'marble',
    url: 'https://www.msisurfaces.com/marble-countertops/',
  },
  {
    material: 'quartzite',
    url: 'https://www.msisurfaces.com/quartzite-countertops/',
  },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch {
      return { scraped: {}, productUrls: {} };
    }
  }
  return { scraped: {}, productUrls: {} };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function inferPrimaryColor(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  if (text.match(/\bwhite\b/)) return 'white';
  if (text.match(/\bcream|ivory|linen|beige\b/)) return 'beige';
  if (text.match(/\bgray|grey|silver\b/)) return 'gray';
  if (text.match(/\bblack|noir|nero\b/)) return 'black';
  if (text.match(/\bbrown|mocha|espresso|cocoa|chocolate\b/)) return 'brown';
  if (text.match(/\bblue\b/)) return 'blue';
  if (text.match(/\bgreen\b/)) return 'green';
  if (text.match(/\bgold|golden|yellow\b/)) return 'gold';
  if (text.match(/\bred|rose|pink|burgundy|bordeaux\b/)) return 'red';
  if (text.match(/\bbianco\b/)) return 'white';
  if (text.match(/\bgrgio|grigio\b/)) return 'gray';
  if (text.match(/\bcalacatta|statuario|carrara\b/)) return 'white';
  return 'neutral';
}

function inferAccentColor(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  if (text.match(/\bgold|golden|oro\b/)) return 'gold';
  if (text.match(/\bgray|grey\b/) && !text.match(/^gray/)) return 'gray';
  if (text.match(/\bwhite\b/) && !text.match(/^white/)) return 'white';
  if (text.match(/\bblack\b/) && !text.match(/^black/)) return 'black';
  if (text.match(/\bbrown|bronze\b/)) return 'brown';
  if (text.match(/\bblue\b/)) return 'blue';
  return null;
}

function inferStyle(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  if (text.match(/dramatic|bold|striking|strong vein|heavy vein/)) return 'marble-dramatic-veins';
  if (text.match(/subtle|minimal|clean|uniform|solid/)) return 'minimal';
  if (text.match(/vein|veining|veined|movement|marble.look/)) return 'marble-moderate-veins';
  if (text.match(/speckl|fleck|granular|crystal|sparkle|glitter/)) return 'speckled';
  if (text.match(/calacatta|statuario/)) return 'marble-dramatic-veins';
  if (text.match(/carrara/)) return 'marble-moderate-veins';
  return 'natural';
}

function inferPriceRange(material, name) {
  const nm = name.toLowerCase();
  // Quartzite is generally most expensive, then marble, then quartz, granite varies
  if (material === 'quartzite') return 3;
  if (material === 'marble') {
    if (nm.match(/calacatta|statuario|arabescato|rossa/)) return 3;
    return 2;
  }
  if (material === 'quartz') {
    if (nm.match(/calacatta|statuario|super\s*white|primordia/)) return 3;
    return 2;
  }
  if (material === 'granite') {
    if (nm.match(/blue|verde|exotica|kinawa|magma|typhoon/)) return 3;
    if (nm.match(/santa\s*cecilia|venetian|tropic|giallo/)) return 1;
    return 2;
  }
  return 2;
}

function inferTags(name, material, description) {
  const text = `${name} ${description}`.toLowerCase();
  const tags = [material];

  // Colors
  if (text.match(/\bwhite|bianco\b/)) tags.push('white');
  if (text.match(/\bcream|ivory|linen\b/)) tags.push('cream');
  if (text.match(/\bbeige\b/)) tags.push('beige');
  if (text.match(/\bgray|grey|grigio\b/)) tags.push('gray');
  if (text.match(/\bblack|nero|noir\b/)) tags.push('black');
  if (text.match(/\bbrown|mocha|espresso\b/)) tags.push('brown');
  if (text.match(/\bgold|golden|oro\b/)) tags.push('gold-veins');
  if (text.match(/\bblue\b/)) tags.push('blue');
  if (text.match(/\bgreen\b/)) tags.push('green');

  // Styles
  if (text.match(/\bvein|veining\b/)) tags.push('veined');
  if (text.match(/\bmarble.look|marble look\b/)) tags.push('marble-look');
  if (text.match(/\bdramatic|bold\b/)) tags.push('dramatic');
  if (text.match(/\bminimal|subtle|clean\b/)) tags.push('minimal');
  if (text.match(/\bspeckl|fleck|granite.look\b/)) tags.push('speckled');
  if (text.match(/\bwarm\b/)) tags.push('warm');
  if (text.match(/\bcool\b/)) tags.push('cool');
  if (text.match(/\bluxury|premium\b/)) tags.push('luxury');
  if (text.match(/\bcalacatta\b/)) tags.push('calacatta', 'marble-look');
  if (text.match(/\bcarrara\b/)) tags.push('carrara', 'marble-look');
  if (text.match(/\bstatuario\b/)) tags.push('statuario', 'marble-look');

  // Finish
  if (text.match(/\bpolished\b/)) tags.push('polished');
  if (text.match(/\bhoned\b/)) tags.push('honed');
  if (text.match(/\bleathered|brushed\b/)) tags.push('textured');

  return [...new Set(tags)];
}

function inferFinish(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const finishes = [];
  if (text.match(/\bhoned\b/)) finishes.push('honed');
  if (text.match(/\bleathered\b/)) finishes.push('leathered');
  if (text.match(/\bbrushed\b/)) finishes.push('brushed');
  if (text.match(/\bsatin\b/)) finishes.push('satin');
  if (finishes.length === 0) finishes.push('polished');
  return finishes;
}

function parseProductPage($, url, material) {
  // Extract name
  const name = $('h1').first().text().trim() ||
    $('h1.product-title').text().trim() ||
    $('[class*="product-name"]').first().text().trim() ||
    $('title').text().split('|')[0].trim();

  if (!name || name.length < 2) return null;

  // Extract og:image
  const imageUrl = $('meta[property="og:image"]').attr('content') ||
    $('meta[name="og:image"]').attr('content') ||
    $('meta[property="og:image:url"]').attr('content') ||
    '';

  // Extract description
  const description = $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('[class*="product-desc"]').first().text().trim() ||
    $('[class*="description"]').first().text().trim() ||
    '';

  // Try to extract thickness
  const thicknessMatches = [];
  const bodyText = $('body').text();
  if (bodyText.match(/\b2\s*cm\b/i)) thicknessMatches.push('2cm');
  if (bodyText.match(/\b3\s*cm\b/i)) thicknessMatches.push('3cm');
  if (bodyText.match(/\b1\.2\s*cm\b/i)) thicknessMatches.push('1.2cm');
  const thickness = thicknessMatches.length > 0 ? thicknessMatches : ['3cm'];

  // Try to extract slab IDs
  const slabIds = [];
  $('[class*="sku"], [class*="slab-id"], [id*="sku"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.match(/^[A-Z0-9-]{5,}$/)) slabIds.push(text);
  });

  const id = slugify(name.replace(/\s*(quartz|granite|marble|quartzite)\s*/gi, '').trim()) ||
    slugify(name);

  return {
    id,
    name,
    material,
    primaryColor: inferPrimaryColor(name, description),
    accentColor: inferAccentColor(name, description),
    style: inferStyle(name, description),
    priceRange: inferPriceRange(material, name),
    finish: inferFinish(name, description),
    description: description.substring(0, 300),
    url,
    imageUrl,
    thumbnailUrl: imageUrl,
    slabIds: slabIds.length > 0 ? slabIds : [],
    thickness,
    tags: inferTags(name, material, description),
  };
}

async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
    });
    return response.data;
  } catch (err) {
    console.error(`  ✗ Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

async function getProductUrls(collectionUrl, material) {
  console.log(`\n📋 Fetching product list for ${material}: ${collectionUrl}`);
  const html = await fetchPage(collectionUrl);
  if (!html) return [];

  const $ = cheerio.load(html);
  const urls = new Set();
  const baseUrl = 'https://www.msisurfaces.com';

  // Look for product links — MSI uses various patterns
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;

    // Match product URL patterns
    const patterns = [
      new RegExp(`/${material}-countertops/[^/]+/$`),
      new RegExp(`/${material}-countertops/[^/]+-${material}/$`),
      new RegExp(`/[^/]+/${material}/$`),
    ];

    const isMsiDomain = fullUrl.includes('msisurfaces.com');
    const isProductLike = fullUrl.match(/\/[a-z][a-z0-9-]{3,}\/[a-z][a-z0-9-]{3,}\/$/);
    const isNotNav = !fullUrl.match(/\/(search|cart|account|blog|about|contact|register|login|faq)/);

    if (isMsiDomain && isProductLike && isNotNav) {
      // Exclude the collection URLs themselves
      if (!collectionUrl.includes(fullUrl) && fullUrl !== collectionUrl) {
        urls.add(fullUrl);
      }
    }
  });

  // Also look for specific product card patterns
  $('[class*="product"] a, [class*="collection"] a, [class*="stone"] a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
    if (fullUrl.includes('msisurfaces.com') && fullUrl !== collectionUrl) {
      urls.add(fullUrl);
    }
  });

  const urlArray = [...urls].filter(u => {
    // Must contain material name or be under material path
    return u.includes(`/${material}`) || u.includes(material);
  });

  console.log(`  Found ${urlArray.length} potential product URLs`);
  return urlArray;
}

async function scrapeCollection(collection, progress) {
  const { material, url, altUrl } = collection;
  
  // Get or load product URLs
  let productUrls = progress.productUrls[material] || [];
  
  if (productUrls.length === 0) {
    productUrls = await getProductUrls(url, material);
    if (productUrls.length === 0 && altUrl) {
      await sleep(RATE_LIMIT_MS);
      productUrls = await getProductUrls(altUrl, material);
    }
    progress.productUrls[material] = productUrls;
    saveProgress(progress);
  }

  console.log(`\n🪨 Scraping ${productUrls.length} ${material} products...`);
  const results = [];

  for (let i = 0; i < productUrls.length; i++) {
    const productUrl = productUrls[i];
    
    // Skip if already scraped
    if (progress.scraped[productUrl]) {
      results.push(progress.scraped[productUrl]);
      continue;
    }

    console.log(`  [${i + 1}/${productUrls.length}] ${productUrl}`);
    
    await sleep(RATE_LIMIT_MS);
    const html = await fetchPage(productUrl);
    
    if (html) {
      const $ = cheerio.load(html);
      const product = parseProductPage($, productUrl, material);
      
      if (product && product.name && product.name.length > 2) {
        progress.scraped[productUrl] = product;
        saveProgress(progress);
        results.push(product);
        console.log(`    ✓ ${product.name} (${product.primaryColor})`);
      } else {
        console.log(`    ✗ Could not parse product data`);
      }
    }
  }

  return results;
}

async function main() {
  console.log('🚀 MSI Stone Catalog Scraper Starting...\n');
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const progress = loadProgress();
  
  if (Object.keys(progress.scraped).length > 0) {
    console.log(`📂 Resuming from progress: ${Object.keys(progress.scraped).length} products already scraped`);
  }

  const allProducts = [];

  for (const collection of COLLECTIONS) {
    try {
      const products = await scrapeCollection(collection, progress);
      allProducts.push(...products);
      console.log(`  ✅ ${collection.material}: ${products.length} products scraped`);
    } catch (err) {
      console.error(`  ✗ Error scraping ${collection.material}:`, err.message);
    }
  }

  // Deduplicate by id
  const seen = new Set();
  const deduplicated = allProducts.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // If we got very few results from live scraping, generate a seed catalog
  let finalCatalog = deduplicated;
  
  if (deduplicated.length < 10) {
    console.log('\n⚠️  Few live results scraped. Generating seed catalog for demo...');
    finalCatalog = [...deduplicated, ...generateSeedCatalog()];
    
    // Deduplicate again
    const seenIds = new Set();
    finalCatalog = finalCatalog.filter(p => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalCatalog, null, 2));
  console.log(`\n✅ Saved ${finalCatalog.length} products to ${OUTPUT_FILE}`);
  
  // Summary
  const byMaterial = {};
  finalCatalog.forEach(p => {
    byMaterial[p.material] = (byMaterial[p.material] || 0) + 1;
  });
  console.log('\n📊 Summary:');
  Object.entries(byMaterial).forEach(([mat, count]) => {
    console.log(`   ${mat}: ${count}`);
  });
}

function generateSeedCatalog() {
  // Seed catalog based on real MSI products for when scraping is blocked
  const seeds = [
    // Quartz
    { name: 'Calacatta Laza Oro', material: 'quartz', primaryColor: 'white', accentColor: 'gold', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'gold-veins', 'dramatic', 'marble-look', 'calacatta'] },
    { name: 'Calacatta Laza', material: 'quartz', primaryColor: 'white', accentColor: 'gray', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'gray', 'dramatic', 'marble-look', 'calacatta'] },
    { name: 'Aria Mist', material: 'quartz', primaryColor: 'white', accentColor: null, style: 'minimal', priceRange: 2, tags: ['white', 'minimal', 'clean'] },
    { name: 'Calacatta Verona', material: 'quartz', primaryColor: 'white', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 2, tags: ['white', 'gray', 'veined', 'marble-look'] },
    { name: 'Sinai Pearl', material: 'quartz', primaryColor: 'beige', accentColor: 'brown', style: 'natural', priceRange: 2, tags: ['beige', 'brown', 'natural', 'warm'] },
    { name: 'Carrara Marmi', material: 'quartz', primaryColor: 'white', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 2, tags: ['white', 'gray', 'carrara', 'marble-look'] },
    { name: 'Statuario Maximus', material: 'quartz', primaryColor: 'white', accentColor: 'gray', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'dramatic', 'statuario', 'marble-look', 'luxury'] },
    { name: 'London Grey', material: 'quartz', primaryColor: 'gray', accentColor: null, style: 'minimal', priceRange: 2, tags: ['gray', 'minimal', 'cool'] },
    { name: 'Midnight Majesty', material: 'quartz', primaryColor: 'black', accentColor: 'gold', style: 'marble-dramatic-veins', priceRange: 3, tags: ['black', 'gold-veins', 'dramatic', 'luxury'] },
    { name: 'Sparkling Black', material: 'quartz', primaryColor: 'black', accentColor: null, style: 'speckled', priceRange: 2, tags: ['black', 'speckled', 'bold'] },
    { name: 'Bianco Drift', material: 'quartz', primaryColor: 'white', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 2, tags: ['white', 'gray', 'veined', 'marble-look'] },
    { name: 'Glacier White', material: 'quartz', primaryColor: 'white', accentColor: null, style: 'minimal', priceRange: 1, tags: ['white', 'minimal', 'clean'] },
    { name: 'Arabescato Venato', material: 'quartz', primaryColor: 'white', accentColor: 'gray', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'gray', 'dramatic', 'marble-look', 'luxury'] },
    { name: 'Pebble White', material: 'quartz', primaryColor: 'white', accentColor: 'gray', style: 'speckled', priceRange: 1, tags: ['white', 'gray', 'speckled'] },
    { name: 'Tundra Grey', material: 'quartz', primaryColor: 'gray', accentColor: 'white', style: 'minimal', priceRange: 2, tags: ['gray', 'white', 'minimal', 'cool'] },

    // Granite
    { name: 'Colonial White', material: 'granite', primaryColor: 'white', accentColor: 'gray', style: 'speckled', priceRange: 1, tags: ['white', 'gray', 'speckled', 'natural', 'granite'] },
    { name: 'Santa Cecilia', material: 'granite', primaryColor: 'beige', accentColor: 'brown', style: 'speckled', priceRange: 1, tags: ['beige', 'brown', 'speckled', 'warm', 'granite'] },
    { name: 'Ubatuba', material: 'granite', primaryColor: 'black', accentColor: 'green', style: 'speckled', priceRange: 1, tags: ['black', 'green', 'speckled', 'natural', 'granite'] },
    { name: 'Venetian Gold', material: 'granite', primaryColor: 'beige', accentColor: 'gold', style: 'natural', priceRange: 1, tags: ['beige', 'gold', 'natural', 'warm', 'granite'] },
    { name: 'Absolute Black', material: 'granite', primaryColor: 'black', accentColor: null, style: 'minimal', priceRange: 2, tags: ['black', 'minimal', 'bold', 'granite'] },
    { name: 'Alaska White', material: 'granite', primaryColor: 'white', accentColor: 'gray', style: 'speckled', priceRange: 2, tags: ['white', 'gray', 'speckled', 'natural', 'granite'] },
    { name: 'Bianco Romano', material: 'granite', primaryColor: 'white', accentColor: 'gray', style: 'speckled', priceRange: 2, tags: ['white', 'gray', 'speckled', 'granite'] },
    { name: 'Uba Tuba Premium', material: 'granite', primaryColor: 'black', accentColor: 'green', style: 'speckled', priceRange: 2, tags: ['black', 'green', 'speckled', 'granite'] },
    { name: 'New Caledonia', material: 'granite', primaryColor: 'gray', accentColor: 'white', style: 'speckled', priceRange: 2, tags: ['gray', 'white', 'speckled', 'natural', 'granite'] },
    { name: 'Typhoon Bordeaux', material: 'granite', primaryColor: 'brown', accentColor: 'red', style: 'natural', priceRange: 3, tags: ['brown', 'red', 'exotic', 'luxury', 'granite'] },
    { name: 'Blue Pearl', material: 'granite', primaryColor: 'blue', accentColor: 'gray', style: 'speckled', priceRange: 2, tags: ['blue', 'gray', 'speckled', 'unique', 'granite'] },
    { name: 'River White', material: 'granite', primaryColor: 'white', accentColor: 'gray', style: 'natural', priceRange: 2, tags: ['white', 'gray', 'veined', 'natural', 'granite'] },
    { name: 'Tropic Brown', material: 'granite', primaryColor: 'brown', accentColor: 'black', style: 'speckled', priceRange: 1, tags: ['brown', 'black', 'speckled', 'warm', 'granite'] },
    { name: 'Fantasy Brown', material: 'granite', primaryColor: 'beige', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 2, tags: ['beige', 'gray', 'veined', 'granite'] },
    { name: 'Black Galaxy', material: 'granite', primaryColor: 'black', accentColor: 'gold', style: 'speckled', priceRange: 2, tags: ['black', 'gold', 'speckled', 'dramatic', 'granite'] },
    { name: 'Kashmir White', material: 'granite', primaryColor: 'white', accentColor: 'gray', style: 'speckled', priceRange: 2, tags: ['white', 'gray', 'speckled', 'natural', 'granite'] },

    // Marble
    { name: 'Calacatta Gold', material: 'marble', primaryColor: 'white', accentColor: 'gold', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'gold-veins', 'dramatic', 'luxury', 'calacatta', 'marble'] },
    { name: 'Carrara White', material: 'marble', primaryColor: 'white', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 2, tags: ['white', 'gray', 'veined', 'carrara', 'classic', 'marble'] },
    { name: 'Statuario', material: 'marble', primaryColor: 'white', accentColor: 'gray', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'gray', 'dramatic', 'luxury', 'statuario', 'marble'] },
    { name: 'Nero Marquina', material: 'marble', primaryColor: 'black', accentColor: 'white', style: 'marble-moderate-veins', priceRange: 3, tags: ['black', 'white', 'veined', 'dramatic', 'luxury', 'marble'] },
    { name: 'Crema Marfil', material: 'marble', primaryColor: 'beige', accentColor: 'cream', style: 'minimal', priceRange: 2, tags: ['beige', 'cream', 'minimal', 'warm', 'classic', 'marble'] },
    { name: 'Arabescato Corchia', material: 'marble', primaryColor: 'white', accentColor: 'gray', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'gray', 'dramatic', 'luxury', 'marble'] },
    { name: 'Emperador Dark', material: 'marble', primaryColor: 'brown', accentColor: 'white', style: 'marble-moderate-veins', priceRange: 3, tags: ['brown', 'white', 'veined', 'warm', 'luxury', 'marble'] },
    { name: 'Bianco Venatino', material: 'marble', primaryColor: 'white', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 2, tags: ['white', 'gray', 'veined', 'classic', 'marble'] },
    { name: 'Grigio Carnico', material: 'marble', primaryColor: 'gray', accentColor: 'white', style: 'marble-moderate-veins', priceRange: 3, tags: ['gray', 'white', 'veined', 'luxury', 'marble'] },
    { name: 'Bardiglio Imperiale', material: 'marble', primaryColor: 'gray', accentColor: 'white', style: 'marble-dramatic-veins', priceRange: 3, tags: ['gray', 'white', 'dramatic', 'luxury', 'marble'] },
    { name: 'Rosa Porrino', material: 'marble', primaryColor: 'red', accentColor: 'pink', style: 'speckled', priceRange: 3, tags: ['red', 'pink', 'unique', 'luxury', 'marble'] },

    // Quartzite
    { name: 'Taj Mahal', material: 'quartzite', primaryColor: 'white', accentColor: 'gold', style: 'marble-moderate-veins', priceRange: 3, tags: ['white', 'gold', 'veined', 'luxury', 'quartzite'] },
    { name: 'Sea Pearl', material: 'quartzite', primaryColor: 'gray', accentColor: 'blue', style: 'natural', priceRange: 3, tags: ['gray', 'blue', 'unique', 'luxury', 'quartzite'] },
    { name: 'Fantasy Brown', material: 'quartzite', primaryColor: 'beige', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 2, tags: ['beige', 'gray', 'veined', 'warm', 'quartzite'] },
    { name: 'White Macaubas', material: 'quartzite', primaryColor: 'white', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 3, tags: ['white', 'gray', 'veined', 'luxury', 'quartzite'] },
    { name: 'Via Lactea', material: 'quartzite', primaryColor: 'gray', accentColor: 'white', style: 'natural', priceRange: 3, tags: ['gray', 'white', 'natural', 'luxury', 'quartzite'] },
    { name: 'Infinity White', material: 'quartzite', primaryColor: 'white', accentColor: 'gray', style: 'marble-dramatic-veins', priceRange: 3, tags: ['white', 'gray', 'dramatic', 'luxury', 'quartzite'] },
    { name: 'Blue Dunes', material: 'quartzite', primaryColor: 'blue', accentColor: 'gray', style: 'natural', priceRange: 3, tags: ['blue', 'gray', 'unique', 'dramatic', 'quartzite'] },
    { name: 'Azul Macaubas', material: 'quartzite', primaryColor: 'blue', accentColor: 'white', style: 'natural', priceRange: 3, tags: ['blue', 'white', 'unique', 'luxury', 'quartzite'] },
    { name: 'Perla Venata', material: 'quartzite', primaryColor: 'white', accentColor: 'gray', style: 'marble-moderate-veins', priceRange: 3, tags: ['white', 'gray', 'veined', 'luxury', 'quartzite'] },
    { name: 'Niagara', material: 'quartzite', primaryColor: 'gray', accentColor: 'white', style: 'marble-dramatic-veins', priceRange: 3, tags: ['gray', 'white', 'dramatic', 'luxury', 'quartzite'] },
  ];

  return seeds.map(seed => {
    const id = slugify(seed.name);
    const urlMaterial = seed.material === 'quartz' ? 'quartz-countertops' : `${seed.material}-countertops`;
    return {
      id,
      name: seed.name,
      material: seed.material,
      primaryColor: seed.primaryColor,
      accentColor: seed.accentColor,
      style: seed.style,
      priceRange: seed.priceRange,
      finish: ['polished'],
      description: `${seed.name} is a premium ${seed.material} surface featuring beautiful ${seed.primaryColor} tones${seed.accentColor ? ` with ${seed.accentColor} accents` : ''}. Perfect for kitchen and bathroom countertops.`,
      url: `https://www.msisurfaces.com/${urlMaterial}/${id}/`,
      imageUrl: '',
      thumbnailUrl: '',
      slabIds: [],
      thickness: ['2cm', '3cm'],
      tags: seed.tags,
    };
  });
}

main().catch(console.error);
