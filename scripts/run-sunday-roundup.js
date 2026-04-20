#!/usr/bin/env node
/**
 * Sunday state roundup — Best Fabricators in Connecticut
 * One-shot script for 2026-04-19 cron run
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { Pool } = require('pg')
const https = require('https')

const DB_URL = process.env.DATABASE_URL
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!DB_URL || !OPENAI_KEY) {
  console.error('❌ Missing DATABASE_URL or OPENAI_API_KEY')
  process.exit(1)
}

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })

function openaiChat(model, messages, maxTokens = 2200) {
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
  if (wordCount < 650) issues.push(`content only ${wordCount} words (need 650+)`)
  const fillers = ['in conclusion', 'it is worth noting', 'needless to say', 'as we can see', 'at the end of the day', 'this beautiful stone']
  for (const f of fillers) {
    if ((article.content || '').toLowerCase().includes(f)) issues.push(`filler phrase: "${f}"`)
  }
  if (!(article.content || '').toLowerCase().includes('quarriva')) issues.push('missing Quarriva mention')
  return issues
}

async function main() {
  const slug = 'best-stone-countertop-fabricators-connecticut'

  // Check for duplicate
  const dup = await pool.query('SELECT slug FROM seo_articles WHERE slug=$1', [slug])
  if (dup.rows.length > 0) {
    console.log(`⚠️  Slug already exists: ${slug}. Exiting.`)
    await pool.end()
    return
  }

  console.log(`📝 Generating Sunday state roundup: ${slug}`)

  const contentPrompt = `Write a practical roundup guide for Connecticut homeowners looking for stone countertop fabricators, for the Quarriva stone marketplace.

Target audience: CT homeowners renovating kitchens or bathrooms who want to find a reliable local stone fabricator.

Article Title: Best Stone Countertop Fabricators in Connecticut

Structure (write all sections in full):

## Why Choosing the Right Fabricator Matters in Connecticut
(2 paragraphs — CT homes often have older kitchens, higher-end remodels, and homeowners who expect quality workmanship. The fabricator you pick matters as much as the stone itself. Mention the competitive CT renovation market.)

## What to Look for in a Connecticut Stone Fabricator
(4 specific criteria: experience with stone types common in CT homes, templating accuracy, lead times, and warranty/support. Write 1 solid paragraph per criterion.)

## Connecticut's Most Popular Stone Choices
(Brief rundown of what CT homeowners are actually choosing in 2026: quartz for durability, quartzite for the natural look, granite for kitchens, marble for bathrooms. Keep it practical, not generic.)

## Connecticut Countertop Pricing: What to Budget
(Realistic installed price ranges per sqft for quartz, granite, quartzite, and marble in CT. Include a note about what drives cost variation — complexity of cuts, edge profiles, stone origin.)

## How Quarriva Helps You Find CT Fabricators
(2 paragraphs — explain that Quarriva is a New England stone marketplace that connects homeowners with vetted local fabricators. Mention that CT markets like Stamford, New Haven, Hartford, and Bridgeport are covered. Explain the matching process: browse stones, request quotes, compare fabricators.)

## Getting Your CT Countertop Project Started
(Short closing section — 1 paragraph encouraging action, what info homeowners need to gather before requesting quotes: measurements, stone preferences, budget range, timeline.)

Requirements:
- Write at least 750 words total
- Be specific to Connecticut — mention CT cities, CT housing stock, CT market context
- Mention Quarriva by name at least twice
- No filler phrases like "this beautiful stone", "in conclusion", "it is worth noting"
- Natural language, practical tone
- Return ONLY the article content with markdown headings`

  console.log('⏳ Generating content with gpt-4o-mini...')
  const content = await openaiChat('gpt-4o-mini', [{ role: 'user', content: contentPrompt }], 2500)

  const title = 'Best Stone Countertop Fabricators in CT'
  const wordCount = content.split(/\s+/).filter(Boolean).length
  console.log(`   Content generated: ${wordCount} words`)

  const metaPrompt = `Write a meta description for an article titled "Best Stone Countertop Fabricators in Connecticut" about finding reliable stone countertop fabricators in CT through Quarriva.

Requirements:
- Exactly 120-160 characters
- Include "Connecticut countertops" or "CT fabricators"
- Compelling and specific
- Return ONLY the meta description text, no quotes`

  console.log('⏳ Generating meta description...')
  const meta = await openaiChat('gpt-4o-mini', [{ role: 'user', content: metaPrompt }], 200)
  console.log(`   Meta: ${meta.length} chars`)

  const article = {
    slug,
    title,
    meta_description: meta.trim(),
    content,
    keywords: 'Connecticut countertop fabricators, CT stone countertops, granite fabricators Connecticut, quartz fabricators CT, countertop shops Connecticut, Quarriva Connecticut, stone countertops Stamford, stone countertops New Haven, stone countertops Hartford',
    state: 'Connecticut',
    city: null,
    stone_type: null,
    category: 'state_roundup',
  }

  // QA pass
  console.log('\n🔍 Running QA checks...')
  const qaIssues = runQA(article)
  const passed = qaIssues.length === 0
  const status = passed ? 'published' : 'flagged'

  if (passed) {
    console.log('   ✅ QA passed')
  } else {
    console.log('   ⚠️  QA issues:', qaIssues.join('; '))
  }

  // Insert
  console.log('\n💾 Inserting into seo_articles...')
  await pool.query(
    `INSERT INTO seo_articles
      (slug, title, meta_description, content, keywords, state, city, stone_type, category,
       status, qa_passed, qa_notes, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      article.slug, article.title, article.meta_description, article.content,
      article.keywords, article.state, article.city, article.stone_type, article.category,
      status, passed,
      qaIssues.length ? qaIssues.join('; ') : null,
      passed ? new Date().toISOString() : null,
    ]
  )

  console.log('\n' + '─'.repeat(50))
  console.log('✅ DONE')
  console.log(`   Title:      ${article.title}`)
  console.log(`   Slug:       ${article.slug}`)
  console.log(`   Word count: ${wordCount}`)
  console.log(`   Meta:       ${article.meta_description.length} chars`)
  console.log(`   QA result:  ${passed ? 'PASSED' : 'FLAGGED — ' + qaIssues.join(', ')}`)
  console.log(`   Status:     ${status}`)

  await pool.end()
}

main().catch(err => {
  console.error('Fatal:', err.message)
  pool.end()
  process.exit(1)
})
