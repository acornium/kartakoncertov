/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  trailingSlash: true,
  basePath: '/kartakoncertov',
  assetPrefix: '/kartakoncertov',
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.0.177', 'localhost:3000'],
}

export default nextConfig
