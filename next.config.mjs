/** @type {import('next').NextConfig} */
const basePath = process.env.NODE_ENV === "production" ? "/kartakoncertov" : ""

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.0.177', 'localhost:3000'],
}

export default nextConfig
