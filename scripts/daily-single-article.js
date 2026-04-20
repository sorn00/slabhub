#!/usr/bin/env node
/**
 * daily-single-article.js
 * Generates and publishes one SEO article for Quarriva.
 * Usage: node daily-single-article.js --type=city --city="Norwalk" --state="Connecticut"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { Pool } = require('pg')
const https = require('https')

const DB_URL = process.env.DATABASE_URL
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!DB_URL || !OPENAI_KEY) {
  console.error('Missing DATABASE_URL or OPENAI_API_KEY')
  process.exit(1)
}

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, ...v] = a.slice(2).split('=')
      return [k, v.join('=')]
    })
)

// ── OpenAI helper ─────────────────────────────────────────────────────────────
function openaiChat(model, messages, maxTokens = 2000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 })
    const opts = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', d => (data += d))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) return reject(new Error(parsed.error.message))
          resolve(parsed.choices[0].message.content.trim())
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function runQA(article) {
  const issues = []
  if (!article.title || article.title.length >= 60) issues.push(`title length ${article.title?.length} (must be <60)`)
  if (!article.meta_description) issues.push('missing meta_description')
  else if (article.meta_description.length < 120 || article.meta_description.length > 160)
    issues.push(`meta length ${article.meta_description.length} (must be 120-160)`)
  const wordCount = (article.content || '').split(/\s+/).filter(Boolean).length
  if (wordCount < 600) issues.push(`content only ${wordCount} words (need 600+)`)
  const fillerPhrases = ['in conclusion', 'it is worth noting', 'needless to say', 'as we can see', 'at the end of the day', 'this beautiful stone']
  for (const f of fillerPhrases) {
    if ((article.content || '').toLowerCase().includes(f)) issues.push(`filler phrase: "${f}"`)
  }
  return issues
}

async function checkSlugExists(slug) {
  const r = await pool.query('SELECT slug FROM seo_articles WHERE slug = $1', [slug])
  return r.rows.length > 0
}

async function insertArticle(article, qaIssues) {
  const qaPassed = qaIssues.length === 0
  const status = qaPassed ? 'published' : 'flagged'
  const publishedAt = qaPassed ? new Date() : null
  await pool.query(
    `INSERT INTO seo_articles
      (slug, title, meta_description, content, keywords, state, city, stone_type, category, status, qa_passed, qa_notes, created_at, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),$13)
     ON CONFLICT (slug) DO NOTHING`,
    [
      article.slug, article.title, article.meta_description, article.content,
      article.keywords, article.state || null, article.city || null,
      article.stone_type || null, article.category, status,
      qaPassed,
      qaIssues.length > 0 ? qaIssues.join('; ') : null,
      publishedAt,
    ]
  )
  return status
}

// ── City article generator ────────────────────────────────────────────────────
async function generateCityArticle(city, state) {
  const slug = toSlug(`${city}-${state}-countertops`)

  const exists = await checkSlugExists(slug)
  if (exists) throw new Error(`Slug already exists: ${slug}`)

  const contentPrompt = `Write an SEO article for Quarriva.com about stone countertop fabricators in ${city}, ${state}.

Target keywords: ${city} countertops, stone countertops ${city} CT, granite countertops ${city}, quartz countertops ${city} ${state}, countertop fabricators ${city}, ${city} kitchen remodel, marble countertops ${city}

Requirements:
- 700-900 words
- Sections: Introduction, Popular Stone Materials in ${city}, What to Look for in a ${city} Fabricator, Cost Ranges in ${city}, How Quarriva Helps ${city} Homeowners, Final Thoughts
- Naturally mention Quarriva as a marketplace that connects ${city} homeowners with local stone fabricators
- Include practical info on stone types (quartz, granite, marble, quartzite), countertop costs, and the fabricator selection process
- Write for real homeowners searching for countertops in ${city}, ${state}
- No filler phrases like "this beautiful stone", "in conclusion", "needless to say"
- Conversational but authoritative tone
- Do NOT use markdown headers with ## — use plain section headers`

  const content = await openaiChat('gpt-4o-mini', [{ role: 'user', content: contentPrompt }])

  const titlePrompt = `Write an SEO page title for a countertop fabricator guide for ${city}, ${state}. Must be under 58 characters, include "${city}" and "countertops". Return ONLY the title text, no quotes.`
  const title = (await openaiChat('gpt-4o-mini', [{ role: 'user', content: titlePrompt }], 100)).substring(0, 59)

  const metaPrompt = `Write a meta description for a countertop fabricator guide for ${city}, ${state} on Quarriva.com. Must be 130-158 characters. Include the city name and mention stone fabricators or Quarriva. Return ONLY the text.`
  let meta = (await openaiChat('gpt-4o-mini', [{ role: 'user', content: metaPrompt }], 200)).replace(/^["']|["']$/g, '')
  // Pad if too short, trim if too long
  if (meta.length > 160) meta = meta.substring(0, 157) + '...'

  return {
    slug,
    title,
    meta_description: meta,
    content,
    keywords: `${city} countertops, granite countertops ${city}, quartz countertops ${city}, stone fabricators ${city}, ${city} kitchen remodel, marble countertops ${city}, countertop cost ${state}, Quarriva ${city}`,
    state: state.substring(0, 2).toUpperCase() === 'CT' ? 'CT' : state === 'Connecticut' ? 'CT' : state === 'Massachusetts' ? 'MA' : state.substring(0, 2),
    city,
    stone_type: null,
    category: 'city_spotlight',
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const type = args.type || 'city'
  const city = args.city || 'Norwalk'
  const state = args.state || 'Connecticut'

  console.log(`\n🚀 Quarriva Daily SEO — ${new Date().toISOString()}`)
  console.log(`📍 Type: ${type} | Target: ${city}, ${state}\n`)

  let article
  if (type === 'city') {
    console.log(`Generating city article: ${city}, ${state}...`)
    article = await generateCityArticle(city, state)
  } else {
    throw new Error(`Unsupported type: ${type}`)
  }

  const wordCount = article.content.split(/\s+/).filter(Boolean).length
  console.log(`\n📝 Draft ready — ${wordCount} words`)
  console.log(`   Title (${article.title.length} chars): ${article.title}`)
  console.log(`   Meta (${article.meta_description.length} chars): ${article.meta_description}`)
  console.log(`   Slug: ${article.slug}`)

  // Local QA
  const qaIssues = runQA(article)

  // GPT-4o QA
  try {
    console.log('\n🔍 Running GPT-4o QA...')
    const qaResponse = await openaiChat('gpt-4o', [{
      role: 'user',
      content: `Review this SEO article for quality. Return "PASS" if good, or "FAIL: [reason]" if not.
Title: ${article.title}
Meta: ${article.meta_description}
Word count: ${wordCount}
First 300 chars of content: ${article.content.substring(0, 300)}`
    }], 150)
    console.log(`   GPT-4o result: ${qaResponse}`)
    if (qaResponse.toUpperCase().startsWith('FAIL')) {
      qaIssues.push(`GPT-4o: ${qaResponse.replace(/^FAIL:\s*/i, '')}`)
    }
  } catch (e) {
    console.log(`   GPT-4o QA skipped: ${e.message}`)
  }

  // Insert
  console.log('\n💾 Publishing to database...')
  const status = await insertArticle(article, qaIssues)

  console.log(`\n${ status === 'published' ? '✅' : '⚠️ '} Status: ${status.toUpperCase()}`)
  if (qaIssues.length > 0) {
    console.log(`   QA Issues: ${qaIssues.join(', ')}`)
  }
  console.log(`\n📊 Summary:`)
  console.log(`   Title:      ${article.title}`)
  console.log(`   Slug:       ${article.slug}`)
  console.log(`   Words:      ${wordCount}`)
  console.log(`   QA Result:  ${qaIssues.length === 0 ? 'PASSED' : 'FLAGGED — ' + qaIssues.join('; ')}`)

  await pool.end()
}

main().catch(err => {
  console.error('Fatal:', err.message)
  pool.end()
  process.exit(1)
})
