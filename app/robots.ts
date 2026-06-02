import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/api/auth/', '/api/embed/', '/api/setup/'],
      },
    ],
    sitemap: 'https://novelcodex.org/sitemap.xml',
  }
}
