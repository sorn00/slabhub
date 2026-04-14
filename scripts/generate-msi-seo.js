#!/usr/bin/env node
// Generate SEO content for MSI stones missing it in Neon DB

const { Client } = require('/Users/sorn/.openclaw/workspace/slabhub/node_modules/pg');
const OpenAI = require('/Users/sorn/.openclaw/workspace/upwork-bot/node_modules/openai').default;
const fs = require('fs');
const path = require('path');

const DB_URL = 'DB_URL_REDACTED';
const OPENAI_KEY = 'OPENAI_KEY_REDACTED';

const catalog = JSON.parse(fs.readFileSync('/Users/sorn/.openclaw/workspace/slabhub/public/data/msi-catalog.json', 'utf8'));

const openai = new OpenAI({ apiKey: OPENAI_KEY });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function generateSEOBatch(stones) {
  const stoneList = stones.map((s, i) => 
    `${i + 1}. ID: ${s.id} | Name: ${s.name} | Material: ${s.material} | Colors: ${s.primaryColor}${s.accentColor && s.accentColor !== s.primaryColor ? '/' + s.accentColor : ''} | Style: ${s.style || 'N/A'} | Existing desc: ${s.description ? s.description.substring(0, 100) : 'none'}`
  ).join('\n');

  const prompt = `You are a luxury stone countertop copywriter for Arts Marble & Granite, a countertop fabricator in Framingham, Massachusetts.

For each stone below, generate SEO content. Return a JSON array with one object per stone in the EXACT same order.

Each object must have:
- "id": the stone ID (copy exactly as given)
- "description": 2-3 sentences, warm designer voice, describe the look/appearance and best use cases (kitchens, bathrooms, etc). Do NOT start with the stone name. Be vivid and specific.
- "seo_title": max 60 chars, format: "{Stone Name} Countertops | Arts Marble & Granite"
- "seo_meta": max 155 chars, mention stone name + key visual features + Massachusetts + "Get a free quote" CTA
- "seo_keywords": array of 6-8 strings: stone name variations, color, material type, "massachusetts countertops", "framingham countertops", "kitchen countertops", "bathroom countertops", plus 1-2 specific to this stone

Stones:
${stoneList}

Return ONLY valid JSON array, no markdown, no explanation.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content.trim();
  // Strip any markdown code fences if present
  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function main() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log('Connected to Neon DB');

  // Get stone_ids that already have seo_title set
  const existing = await db.query(`SELECT stone_id FROM stone_prices WHERE seo_title IS NOT NULL AND seo_title != ''`);
  const existingIds = new Set(existing.rows.map(r => r.stone_id));
  console.log(`Stones already with SEO: ${existingIds.size}`);

  // Also get all stone_ids in DB to know what we can update
  const allInDb = await db.query(`SELECT stone_id, stone_name FROM stone_prices`);
  const dbStoneIds = new Set(allInDb.rows.map(r => r.stone_id));
  console.log(`Total stones in DB: ${dbStoneIds.size}`);

  // Find catalog stones missing SEO that exist in DB
  // Try matching with and without material suffix
  const missingStones = [];
  for (const stone of catalog) {
    const id = stone.id;
    const idWithMaterial = `${stone.id}-${stone.material}`;
    
    let matchedId = null;
    if (dbStoneIds.has(id) && !existingIds.has(id)) {
      matchedId = id;
    } else if (dbStoneIds.has(idWithMaterial) && !existingIds.has(idWithMaterial)) {
      matchedId = idWithMaterial;
    }
    
    if (matchedId) {
      missingStones.push({ ...stone, dbId: matchedId });
    }
  }

  console.log(`Stones needing SEO generation: ${missingStones.length}`);

  if (missingStones.length === 0) {
    console.log('All stones already have SEO content!');
    await db.end();
    return;
  }

  const batches = chunkArray(missingStones, 15);
  let totalUpdated = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`\nBatch ${batchIdx + 1}/${batches.length}: Processing ${batch.length} stones...`);
    console.log('  Stones:', batch.map(s => s.id).join(', '));

    try {
      const seoResults = await generateSEOBatch(batch);
      
      // Match results back to batch by index
      for (let i = 0; i < batch.length; i++) {
        const stone = batch[i];
        const seo = seoResults[i];
        
        if (!seo) {
          console.log(`  ⚠️  No SEO result for ${stone.dbId}`);
          continue;
        }

        // Enforce length limits
        const seoTitle = (seo.seo_title || '').substring(0, 60);
        const seoMeta = (seo.seo_meta || '').substring(0, 155);
        const description = seo.description || '';
        const keywords = Array.isArray(seo.seo_keywords) ? seo.seo_keywords : [];

        await db.query(
          `UPDATE stone_prices SET 
            description = $1,
            seo_title = $2,
            seo_meta = $3,
            seo_keywords = $4
          WHERE stone_id = $5`,
          [description, seoTitle, seoMeta, keywords, stone.dbId]
        );
        console.log(`  ✓ ${stone.dbId} → "${seoTitle}"`);
        totalUpdated++;
      }

      console.log(`  Batch ${batchIdx + 1} done. ${totalUpdated} updated so far.`);
    } catch (err) {
      console.error(`  ❌ Batch ${batchIdx + 1} failed:`, err.message);
      // Continue with next batch
    }

    if (batchIdx < batches.length - 1) {
      await sleep(1000);
    }
  }

  // Final count of stones with SEO
  const finalCount = await db.query(`SELECT COUNT(*) as cnt FROM stone_prices WHERE seo_title IS NOT NULL AND seo_title != ''`);
  console.log(`\n✅ Done! ${totalUpdated} stones updated this run.`);
  console.log(`📊 Total stones with SEO content in DB: ${finalCount.rows[0].cnt}`);

  await db.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
