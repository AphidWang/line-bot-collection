/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // 排除 undici 套件，避免私有欄位語法問題
    config.externals = config.externals || []
    config.externals.push('undici')
    
    return config
  },
}

module.exports = nextConfig
