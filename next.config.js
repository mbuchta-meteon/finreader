/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent MIME type sniffing — stops browser from guessing content types
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Block site from being embedded in iframes (clickjacking protection)
  { key: 'X-Frame-Options', value: 'DENY' },

  // Force HTTPS for 2 years, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },

  // Control referrer info sent to other sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Disable browser features we don't use
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },

  // XSS protection (legacy browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },

  // Content Security Policy — controls what resources can load
  // Allows: self, Cloudflare Turnstile, Stripe, Google/GitHub OAuth
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self + Turnstile + Stripe (both needed for checkout)
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://js.stripe.com",
      // Styles: self + inline (recharts/inline styles need this)
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs + Vercel image optimization
      "img-src 'self' data: blob: https://*.googleusercontent.com https://avatars.githubusercontent.com",
      // Fonts: self only
      "font-src 'self'",
      // Frames: Turnstile challenge + Stripe
      "frame-src https://challenges.cloudflare.com https://js.stripe.com",
      // Connections: self + all our external APIs
      "connect-src 'self' https://challenges.cloudflare.com https://api.anthropic.com https://generativelanguage.googleapis.com https://*.turso.io",
      // No object/embed elements
      "object-src 'none'",
      // Base URI restricted to self
      "base-uri 'self'",
      // Forms only to self
      "form-action 'self'",
      // Upgrade insecure requests in production
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  serverExternalPackages: [
    'pdfjs-dist',
    '@libsql/client',
  ],

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
