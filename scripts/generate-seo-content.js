#!/usr/bin/env node
/**
 * generate-seo-content.js
 * Generates SEO articles for Quarriva's New England stone marketplace.
 * Uses gpt-4o-mini for content generation, gpt-4o for QA.
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

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
})

// ─── OpenAI helper ────────────────────────────────────────────────────────────
function openaiChat(model, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.7 })
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
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ─── Slug helper ──────────────────────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ─── QA check ─────────────────────────────────────────────────────────────────
function runQA(article) {
  const issues = []
  if (!article.title || article.title.length >= 60) issues.push(`title length ${article.title?.length} (must be <60)`)
  if (!article.meta_description) issues.push('missing meta_description')
  else if (article.meta_description.length < 120 || article.meta_description.length > 160)
    issues.push(`meta length ${article.meta_description.length} (must be 120-160)`)
  const wordCount = (article.content || '').split(/\s+/).filter(Boolean).length
  if (wordCount < 600) issues.push(`content only ${wordCount} words (need 600+)`)
  const fillerPhrases = ['in conclusion', 'it is worth noting', 'needless to say', 'as we can see', 'at the end of the day']
  for (const f of fillerPhrases) {
    if ((article.content || '').toLowerCase().includes(f)) issues.push(`filler phrase found: "${f}"`)
  }
  return issues
}

// ─── DB upsert ────────────────────────────────────────────────────────────────
async function upsertArticle(article, qaIssues) {
  const passed = qaIssues.length === 0
  const status = passed ? 'published' : 'flagged'
  const publishedAt = passed ? new Date().toISOString() : null
  const qaNotesStr = qaIssues.length ? qaIssues.join('; ') : null

  await pool.query(
    `INSERT INTO seo_articles
      (slug, title, meta_description, content, keywords, state, city, stone_type, category,
       status, qa_passed, qa_notes, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (slug) DO UPDATE SET
       title=$2, meta_description=$3, content=$4, keywords=$5,
       state=$6, city=$7, stone_type=$8, category=$9,
       status=$10, qa_passed=$11, qa_notes=$12, published_at=$13`,
    [
      article.slug, article.title, article.meta_description, article.content,
      article.keywords, article.state, article.city, article.stone_type, article.category,
      status, passed, qaNotesStr, publishedAt,
    ]
  )
  return { slug: article.slug, status, issues: qaIssues }
}

// ─── Article generators ───────────────────────────────────────────────────────

async function generateStateGuide(state) {
  const slug = `${toSlug(state)}-stone-countertops-guide`
  const prompt = `Write a comprehensive buyer's guide for quartz and granite countertops in ${state} for the Quarriva stone marketplace.

Structure:
# Quartz & Granite Countertops in ${state}: Complete Buyer's Guide

## Why ${state} Homeowners Love Stone Countertops
(2-3 paragraphs about local home improvement trends, typical home styles in ${state})

## Top Stone Types Available in ${state}
(Cover quartz, granite, marble, quartzite — 1 paragraph each)

## How to Choose the Right Stone for Your ${state} Home
(Climate considerations, maintenance, budget guidance)

## Pricing Guide for ${state}
(Typical installed price ranges, factors that affect cost)

## Finding a Local Fabricator in ${state}
(What to look for, questions to ask, why using a local fabricator matters)

## Getting Started with Quarriva in ${state}
(Call to action, how the process works)

Write at least 700 words total. Be specific to ${state}'s market. No filler phrases.
Return ONLY the article content (no JSON, no metadata).`

  const content = await openaiChat('gpt-4o-mini', [{ role: 'user', content: prompt }])

  const title = `${state} Stone Countertops: Complete Buyer's Guide`
  const metaPrompt = `Write a meta description for this article titled "${title}" about quartz and granite countertops in ${state}. Must be 120-160 characters, compelling, include "${state} countertops". Return ONLY the meta description text.`
  const meta = await openaiChat('gpt-4o-mini', [{ role: 'user', content: metaPrompt }])

  return {
    slug,
    title: title.substring(0, 59),
    meta_description: meta.substring(0, 160),
    content,
    keywords: `${state} countertops, quartz ${state}, granite ${state}, stone countertops ${state}`,
    state,
    city: null,
    stone_type: null,
    category: 'state_guide',
  }
}

async function generateCityArticle(city, state) {
  const slug = `${toSlug(city)}-${toSlug(state)}-countertops`
  const prompt = `Write a local guide for stone countertop shoppers in ${city}, ${state} for the Quarriva stone marketplace.

Structure:
# Stone Countertops in ${city}, ${state}: Local Guide

## Countertop Shopping in ${city}
(2 paragraphs about the local market, neighborhood characteristics)

## Most Popular Stones in ${city}
(What styles and materials are popular in ${city}-area homes, 3 specific stone examples)

## ${city} Countertop Installation: What to Expect
(Timeline, process, what homeowners in ${city} need to know)

## Pricing in ${city}, ${state}
(Local pricing context, typical ranges)

## Why Choose Quarriva for Your ${city} Project
(Value prop, local fabricator network)

Write 650+ words, be geographically specific to ${city}, ${state}. No filler phrases.
Return ONLY the article content.`

  const content = await openaiChat('gpt-4o-mini', [{ role: 'user', content: prompt }])

  const title = `Stone Countertops in ${city}, ${state}: Local Guide`
  const metaPrompt = `Write a meta description for "${title}". Must be 120-160 characters, include "${city} countertops". Return ONLY the text.`
  const meta = await openaiChat('gpt-4o-mini', [{ role: 'user', content: metaPrompt }])

  return {
    slug,
    title: title.substring(0, 59),
    meta_description: meta.substring(0, 160),
    content,
    keywords: `${city} countertops, ${city} quartz, ${city} granite, countertops ${state}`,
    state,
    city,
    stone_type: null,
    category: 'city_guide',
  }
}

async function generateComparisonArticle(topic) {
  const slug = toSlug(topic.title)
  const prompt = `Write a detailed comparison article for the Quarriva stone marketplace.

Topic: ${topic.prompt}

Structure:
# ${topic.title}

## Overview
(Brief intro, why this comparison matters)

## ${topic.a}: Pros & Cons
(Detailed breakdown)

## ${topic.b}: Pros & Cons
(Detailed breakdown)

## Head-to-Head Comparison
(Side-by-side on key factors: durability, maintenance, cost, aesthetics, resale value)

## Which Should You Choose?
(Decision framework based on budget, lifestyle, design goals)

## Where to Buy in New England
(Mention Quarriva, MSI surfaces, local fabricators)

Write 700+ words. Be direct and practical. No filler phrases.
Return ONLY the article content.`

  const content = await openaiChat('gpt-4o-mini', [{ role: 'user', content: prompt }])

  const metaPrompt = `Write a meta description for "${topic.title}". Must be 120-160 characters, practical and compelling. Return ONLY the text.`
  const meta = await openaiChat('gpt-4o-mini', [{ role: 'user', content: metaPrompt }])

  return {
    slug,
    title: topic.title.substring(0, 59),
    meta_description: meta.substring(0, 160),
    content,
    keywords: topic.keywords,
    state: null,
    city: null,
    stone_type: null,
    category: 'comparison',
  }
}

async function generateBuyerGuide(topic) {
  const slug = toSlug(topic.title)
  const prompt = `Write a practical buyer's guide for the Quarriva stone marketplace.

Topic: ${topic.prompt}

Structure:
# ${topic.title}

## Introduction
(Why this guide matters, who it's for)

## Key Factors to Consider
(3-4 major decision points with detail)

## Budget Guide
(Price ranges, what you get at each level)

## New England Market Specifics
(Local considerations for MA, CT, RI, NH, VT, ME buyers)

## Step-by-Step Process
(How to go from idea to installed countertop using Quarriva)

## Common Mistakes to Avoid
(3-5 practical pitfalls)

## Conclusion
(Summary and call to action for Quarriva)

Write 700+ words. Practical, actionable content. No filler phrases.
Return ONLY the article content.`

  const content = await openaiChat('gpt-4o-mini', [{ role: 'user', content: prompt }])

  const metaPrompt = `Write a meta description for "${topic.title}". Must be 120-160 characters, helpful and specific. Return ONLY the text.`
  const meta = await openaiChat('gpt-4o-mini', [{ role: 'user', content: metaPrompt }])

  return {
    slug,
    title: topic.title.substring(0, 59),
    meta_description: meta.substring(0, 160),
    content,
    keywords: topic.keywords,
    state: null,
    city: null,
    stone_type: null,
    category: 'buyer_guide',
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting Quarriva SEO content generation...\n')

  const results = { published: 0, flagged: 0, errors: 0 }
  const allResults = []

  async function processArticle(label, generateFn) {
    try {
      process.stdout.write(`  Generating: ${label}... `)
      const article = await generateFn()
      const qaIssues = runQA(article)

      // GPT-4o QA for borderline cases
      if (qaIssues.length === 0 || (qaIssues.length === 1 && qaIssues[0].includes('title length'))) {
        // Quick GPT-4o QA check
        try {
          const qaResponse = await openaiChat('gpt-4o', [{
            role: 'user',
            content: `Review this article title and meta description for SEO quality. Return "PASS" if both are good, or "FAIL: [issue]" if there are problems.
Title: ${article.title}
Meta: ${article.meta_description}
Word count: ~${(article.content || '').split(/\s+/).filter(Boolean).length}`
          }])
          if (qaResponse.toUpperCase().startsWith('FAIL')) {
            qaIssues.push(`GPT-4o QA: ${qaResponse.replace(/^FAIL:\s*/i, '')}`)
          }
        } catch {
          // QA model failure is non-blocking
        }
      }

      const result = await upsertArticle(article, qaIssues)
      if (result.status === 'published') {
        results.published++
        console.log('✅ published')
      } else {
        results.flagged++
        console.log(`⚠️  flagged: ${result.issues.join(', ')}`)
      }
      allResults.push(result)
    } catch (err) {
      results.errors++
      console.log(`❌ ERROR: ${err.message}`)
      allResults.push({ slug: label, status: 'error', issues: [err.message] })
    }
  }

  // ── State Guides (6) ──────────────────────────────────────────────────────
  console.log('📍 Generating State Guides (6)...')
  const states = ['Connecticut', 'Massachusetts', 'Rhode Island', 'New Hampshire', 'Vermont', 'Maine']
  for (const state of states) {
    await processArticle(`${state} state guide`, () => generateStateGuide(state))
  }

  // ── City Articles (18 — 3 per state) ─────────────────────────────────────
  console.log('\n🏙️  Generating City Articles (18)...')
  const stateCities = {
    Connecticut: ['Stamford', 'New Haven', 'Hartford'],
    Massachusetts: ['Boston', 'Worcester', 'Cambridge'],
    'Rhode Island': ['Providence', 'Warwick', 'Cranston'],
    'New Hampshire': ['Manchester', 'Nashua', 'Portsmouth'],
    Vermont: ['Burlington', 'Rutland', 'Montpelier'],
    Maine: ['Portland', 'Bangor', 'Augusta'],
  }
  for (const [state, cities] of Object.entries(stateCities)) {
    for (const city of cities) {
      await processArticle(`${city}, ${state}`, () => generateCityArticle(city, state))
    }
  }

  // ── Comparison Articles (6) ───────────────────────────────────────────────
  console.log('\n⚖️  Generating Comparison Articles (6)...')
  const comparisons = [
    {
      title: 'Quartz vs Granite Countertops: 2026 Guide',
      a: 'Quartz', b: 'Granite',
      prompt: 'Compare quartz vs granite countertops for homeowners in 2026 — durability, cost, maintenance, and aesthetics.',
      keywords: 'quartz vs granite, quartz countertops, granite countertops, comparison',
    },
    {
      title: 'MSI vs Cambria Quartz: Which Is Better?',
      a: 'MSI Quartz', b: 'Cambria Quartz',
      prompt: 'Compare MSI quartz vs Cambria quartz countertops — quality, pricing, warranty, and availability.',
      keywords: 'MSI quartz, Cambria quartz, quartz brands comparison',
    },
    {
      title: 'Marble vs Quartzite Countertops: Key Differences',
      a: 'Marble', b: 'Quartzite',
      prompt: 'Compare marble vs quartzite countertops — durability, maintenance, cost, and which is right for your home.',
      keywords: 'marble countertops, quartzite countertops, marble vs quartzite',
    },
    {
      title: 'Quartz vs Marble: Which Is Right for You?',
      a: 'Quartz', b: 'Marble',
      prompt: 'Compare engineered quartz vs natural marble for kitchen and bathroom countertops.',
      keywords: 'quartz vs marble, quartz countertops, marble countertops',
    },
    {
      title: 'Granite vs Quartzite: What\'s the Difference?',
      a: 'Granite', b: 'Quartzite',
      prompt: 'Compare natural granite vs quartzite countertops for New England homeowners.',
      keywords: 'granite vs quartzite, granite countertops, quartzite countertops',
    },
    {
      title: '3cm vs 2cm Stone Countertops: Which to Choose',
      a: '3cm Stone', b: '2cm Stone',
      prompt: 'Compare 3cm vs 2cm thickness for stone countertops — strength, cost, aesthetics, and installation.',
      keywords: '3cm countertops, 2cm countertops, stone thickness, countertop buying guide',
    },
  ]
  for (const comp of comparisons) {
    await processArticle(comp.title, () => generateComparisonArticle(comp))
  }

  // ── Buyer Guides (6) ──────────────────────────────────────────────────────
  console.log('\n🛒 Generating Buyer Guides (6)...')
  const buyerGuides = [
    {
      title: 'How to Buy Stone Countertops in New England',
      prompt: 'A complete guide for New England homeowners buying stone countertops — from selection to installation.',
      keywords: 'buy stone countertops, countertop buying guide, New England countertops',
    },
    {
      title: 'Kitchen Countertop Cost Guide for 2026',
      prompt: 'Complete pricing guide for kitchen countertops in 2026 — quartz, granite, marble, installation costs.',
      keywords: 'countertop cost, kitchen countertop prices, countertop installation cost 2026',
    },
    {
      title: 'How to Choose Kitchen Countertop Material',
      prompt: 'Step-by-step guide to choosing the right countertop material for your kitchen — lifestyle, budget, and design.',
      keywords: 'choose countertop material, kitchen countertop guide, best countertop material',
    },
    {
      title: 'Quartz Countertop Maintenance: Complete Guide',
      prompt: 'Everything you need to know about caring for quartz countertops — cleaning, sealing, damage prevention.',
      keywords: 'quartz countertop care, quartz maintenance, clean quartz countertops',
    },
    {
      title: 'Stone Countertop Installation: What to Expect',
      prompt: 'Guide to the stone countertop installation process — timeline, what happens on installation day, prep tips.',
      keywords: 'countertop installation, stone countertop install, countertop installation process',
    },
    {
      title: 'Best Countertops for Home Resale Value in 2026',
      prompt: 'Which countertop materials add the most value when selling your home in 2026 in New England.',
      keywords: 'countertops home value, best countertops resale, kitchen countertop ROI',
    },
  ]
  for (const guide of buyerGuides) {
    await processArticle(guide.title, () => generateBuyerGuide(guide))
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log('✅ SEO Content Generation Complete')
  console.log(`   Published: ${results.published}`)
  console.log(`   Flagged:   ${results.flagged}`)
  console.log(`   Errors:    ${results.errors}`)
  console.log(`   Total:     ${results.published + results.flagged + results.errors}`)

  if (results.flagged > 0) {
    console.log('\n⚠️  Flagged articles (need review):')
    allResults.filter(r => r.status === 'flagged').forEach(r => {
      console.log(`   - ${r.slug}: ${r.issues.join(', ')}`)
    })
  }

  await pool.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  pool.end()
  process.exit(1)
})
