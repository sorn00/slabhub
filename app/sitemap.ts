import { MetadataRoute } from 'next'
import townsData from '@/public/data/towns.json'
import { getPool } from '@/lib/db'

type TownEntry = { slug: string; name: string; county: string; pop: number }
const towns = townsData as Record<string, TownEntry[]>

const NE_STATES = [
  'connecticut',
  'massachusetts',
  'rhode-island',
  'new-hampshire',
  'vermont',
  'maine',
]

function cityToSlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://quarriva.com'

  // Fetch DB-driven routes safely
  let seoCities: { city: string; state: string; state_code: string }[] = []
  let publishedSlugs: { slug: string }[] = []
  try {
    const pool = getPool()
    const [citiesRes, slugsRes] = await Promise.all([
      pool.query('SELECT city, state, state_code FROM seo_cities ORDER BY state, city'),
      pool.query("SELECT slug FROM seo_articles WHERE status='published'"),
    ])
    seoCities = citiesRes.rows
    publishedSlugs = slugsRes.rows
  } catch {
    // Non-fatal — sitemap still works with static routes
  }

  const stateCodeToSlug: Record<string, string> = {
    CT: 'connecticut',
    MA: 'massachusetts',
    RI: 'rhode-island',
    NH: 'new-hampshire',
    VT: 'vermont',
    ME: 'maine',
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/stones`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/quote`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/fabricators`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/design`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/cabinets`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/cabinets/quote`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/design/submit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/countertops`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/countertops/massachusetts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/countertops/connecticut`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/countertops/new-york`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/countertops/florida`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/countertops/texas`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
  ]

  const townPages: MetadataRoute.Sitemap = []
  for (const [state, townList] of Object.entries(towns)) {
    for (const town of townList) {
      townPages.push({
        url: `${baseUrl}/countertops/${state}/${town.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      })
    }
  }

  // /location/[state] — 6 NE state pages
  const statePages: MetadataRoute.Sitemap = NE_STATES.map(state => ({
    url: `${baseUrl}/location/${state}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // /stones/[state]/[city] — all cities from seo_cities
  const cityPages: MetadataRoute.Sitemap = seoCities
    .filter(c => stateCodeToSlug[c.state_code])
    .map(c => ({
      url: `${baseUrl}/stones/${stateCodeToSlug[c.state_code]}/${cityToSlug(c.city)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }))

  // /blog/[slug] — published articles
  const blogPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    ...publishedSlugs.map(({ slug }) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
  ]

  return [...staticPages, ...statePages, ...cityPages, ...blogPages, ...townPages]
}
