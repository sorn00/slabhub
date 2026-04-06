const axios = require('axios');
const fs = require('fs');
const path = require('path');

const catalog = require('../public/data/msi-catalog.json');
const BASE = '/Users/sorn/.openclaw/workspace/slabhub/public/stones';

// Create subdirs
['slabs','roomscenes','vignettes','products'].forEach(d => fs.mkdirSync(path.join(BASE, d), {recursive: true}));

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function download(url, dest) {
  if (!url) return false;
  if (fs.existsSync(dest)) return true;
  try {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000, headers: {'User-Agent': 'Mozilla/5.0'} });
    fs.writeFileSync(dest, r.data);
    return true;
  } catch(e) { return false; }
}

function slugify(name) {
  return (name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function buildUrls(stone) {
  const slug = slugify(stone.name);
  const mat = stone.material || 'quartz';
  const base = `https://cdn.msisurfaces.com/images/${mat}-countertops/products`;
  return {
    slab: `${base}/slabs/medium/${slug}-${mat}.jpg`,
    roomscene: `${base}/roomscenes/medium/${slug}-${mat}.jpg`,
    vignette: `${base}/vignettes/medium/${slug}-${mat}.jpg`,
    product: stone.imageUrl || null
  };
}

async function run() {
  let done = 0, total = catalog.length;
  const results = {};

  for (const stone of catalog) {
    const slug = slugify(stone.name);
    const urls = buildUrls(stone);
    const stoneResults = {};

    const [s, r, v, p] = await Promise.all([
      download(urls.slab, path.join(BASE, 'slabs', slug + '.jpg')),
      download(urls.roomscene, path.join(BASE, 'roomscenes', slug + '.jpg')),
      download(urls.vignette, path.join(BASE, 'vignettes', slug + '.jpg')),
      download(urls.product, path.join(BASE, 'products', slug + '.jpg')),
    ]);

    stoneResults.slab = s;
    stoneResults.roomscene = r;
    stoneResults.vignette = v;
    stoneResults.product = p;
    results[slug] = stoneResults;

    done++;
    const total_imgs = [s,r,v,p].filter(Boolean).length;
    process.stdout.write(`\r[${done}/${total}] ${stone.name} — ${total_imgs}/4 images`);
    await sleep(400);
  }

  console.log('\n\nDone!');
  const summary = {
    total: catalog.length,
    slabs: Object.values(results).filter(r => r.slab).length,
    roomscenes: Object.values(results).filter(r => r.roomscene).length,
    vignettes: Object.values(results).filter(r => r.vignette).length,
    products: Object.values(results).filter(r => r.product).length,
  };
  console.log(JSON.stringify(summary, null, 2));
  fs.writeFileSync('/tmp/image-download-summary.json', JSON.stringify(summary, null, 2));
}

run().catch(console.error);
