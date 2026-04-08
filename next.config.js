/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'pdfjs-dist',
    '@libsql/client',
  ],
}

module.exports = nextConfig
