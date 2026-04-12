import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Finance Analyzer — Bank Statement Analysis in Seconds',
    template: '%s | Finance Analyzer',
  },
  description: 'Upload your bank statement (PDF, image or CSV) and instantly see spending by category, detect subscriptions, track regular payments and get actionable insights — no bank login required.',
  keywords: [
    'bank statement analyzer', 'spending analysis', 'subscription detector',
    'bank statement insights', 'personal finance tool', 'analyze bank statement',
    'spending tracker', 'výpis z účtu analýza', 'analýza výdajů', 'přehled výdajů',
  ],
  authors: [{ name: 'Finance Analyzer' }],
  creator: 'Finance Analyzer',
  metadataBase: new URL('https://finreader.vercel.app'),
  alternates: {
    canonical: 'https://finreader.vercel.app',
  },
  openGraph: {
    type: 'website',
    url: 'https://finreader.vercel.app',
    title: 'Finance Analyzer — Bank Statement Analysis in Seconds',
    description: 'Upload your bank statement and instantly see where your money goes. Spending categories, subscriptions, regular payments and more — free, no bank login needed.',
    siteName: 'Finance Analyzer',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finance Analyzer — Bank Statement Analysis in Seconds',
    description: 'Upload your bank statement and instantly see where your money goes. Free, no bank login needed.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  verification: {
    google: 'johOyAsGJHb3-V3yf3mvShLvG2zVd6h8X3Hve31-Z4s',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Finance Analyzer',
    url: 'https://finreader.vercel.app',
    description: 'Upload your bank statement (PDF, image or CSV) and instantly see spending by category, detect subscriptions, track regular payments and get actionable insights.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        description: 'Free — 1 analysis, no account needed',
      },
      {
        '@type': 'Offer',
        price: '4.00',
        priceCurrency: 'EUR',
        description: 'Pro — unlimited analyses, multi-file, history',
      },
    ],
    featureList: [
      'Spending breakdown by category',
      'Subscription detection',
      'Regular payment tracking',
      'Monthly trend charts',
      'Investment tracking',
      'PDF, image and CSV support',
      'No bank login required',
    ],
    inLanguage: ['en', 'cs'],
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
