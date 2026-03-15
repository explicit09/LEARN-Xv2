import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@learn-x/ui', '@learn-x/validators', '@learn-x/types', '@learn-x/utils'],
}

export default nextConfig
