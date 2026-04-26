import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/crm'],
    },
    sitemap: 'https://quarriva.com/sitemap.xml',
    host: 'https://quarriva.com',
  }
}
