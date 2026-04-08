/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'pdf-parse',
    'pdfjs-dist',
    '@libsql/client',
  ],
}

module.exports = nextConfig
