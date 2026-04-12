import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/ops-dashboard', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://finreader.vercel.app/sitemap.xml',
  }
}
