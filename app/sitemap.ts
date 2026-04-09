import { MetadataRoute } from 'next'
import townsData from '@/public/data/towns.json'

type TownEntry = { slug: string; name: string; county: string; pop: number }
const towns = townsData as Record<string, TownEntry[]>

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://quarriva.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/stones`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/quote`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/fabricators`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
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

  return [...staticPages, ...townPages]
}
