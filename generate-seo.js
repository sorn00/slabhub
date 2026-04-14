#!/usr/bin/env node
/**
 * SEO content generator for MSI stones — uses axios (Node 16 compatible)
 */

const { Pool } = require('/Users/sorn/.openclaw/workspace/slabhub/node_modules/pg');
const axios = require('/Users/sorn/.openclaw/workspace/slabhub/node_modules/axios');
const fs = require('fs');

const OPENAI_KEY = 'OPENAI_KEY_REDACTED';

const pool = new Pool({
  connectionString: 'DB_URL_REDACTED',
  ssl: { rejectUnauthorized: false }
});

const catalog = JSON.parse(fs.readFileSync('/Users/sorn/.openclaw/workspace/slabhub/public/data/msi-catalog.json', 'utf8'));
const stones = Array.isArray(catalog) ? catalog : Object.values(catalog)[0];

// Build catalog lookup
const catalogMap = {};
for (const s of stones) {
  catalogMap[s.id] = s;
}

async function generateSEO(stone) {
  const material = stone.material || 'stone';
  const name = stone.stone_name || stone.stone_id;
  const description = stone.description || '';
  const color = stone.primary_color || '';
  const style = stone.style || '';
  const finish = Array.isArray(stone.finish) ? stone.finish.join(', ') : (stone.finish || '');

  const prompt = `You are an SEO copywriter for a premium countertop stone supplier (Arts Marble & Granite, Massachusetts).

Generate SEO content for this MSI ${material} slab:
- Name: ${name}
- Material: ${material}
- Color: ${color}
- Style: ${style}
- Finish: ${finish}
- Description: ${description}

Return ONLY valid JSON with these fields:
{
  "seo_title": "60-70 char title including stone name + material + countertop keyword",
  "seo_meta": "150-160 char meta description, mention local availability in Massachusetts/New England, include a call to action",
  "seo_keywords": ["array", "of", "8-12", "targeted", "keywords"]
}

Focus on: countertops, kitchen, bathroom, slabs, local delivery, Massachusetts.`;

  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return JSON.parse(resp.data.choices[0].message.content);
}

async function main() {
  const { rows: pending } = await pool.query(
    `SELECT sp.stone_id, sp.stone_name, sp.material, sp.description, sp.primary_color, sp.style, sp.finish
     FROM stone_prices sp
     WHERE sp.seo_title IS NULL
     ORDER BY sp.stone_id`
  );

  console.log(`\n📋 Stones to process: ${pending.length}`);

  let done = 0;
  let errors = 0;

  for (const stone of pending) {
    // Enrich with catalog data if available
    const baseId = stone.stone_id
      .replace(/-quartz$/, '')
      .replace(/-granite$/, '')
      .replace(/-quartzite$/, '')
      .replace(/-marble$/, '');
    const catEntry = catalogMap[stone.stone_id] || catalogMap[baseId];
    const enriched = {
      ...stone,
      description: stone.description || catEntry?.description || '',
      primary_color: stone.primary_color || catEntry?.primaryColor || '',
      style: stone.style || catEntry?.style || '',
      finish: stone.finish || catEntry?.finish || []
    };

    try {
      process.stdout.write(`[${done + errors + 1}/${pending.length}] ${stone.stone_id} ... `);
      const seo = await generateSEO(enriched);

      await pool.query(
        `UPDATE stone_prices
         SET seo_title = $1, seo_meta = $2, seo_keywords = $3
         WHERE stone_id = $4`,
        [seo.seo_title, seo.seo_meta, seo.seo_keywords, stone.stone_id]
      );

      console.log(`✓ "${seo.seo_title}"`);
      done++;

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 250));

    } catch (err) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error(`✗ ERROR: ${msg}`);
      errors++;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n✅ Done! ${done} updated, ${errors} errors.`);
  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
