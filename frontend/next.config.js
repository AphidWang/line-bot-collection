/** @type {import('next').NextConfig} */
const nextConfig = {
  // 輸出模式設定
  output: 'standalone',
  
  // 移除舊的 API rewrite 規則，現在使用環境變數配置
  webpack: (config, { isServer }) => {
    // 排除 undici 套件，避免私有欄位語法問題
    config.externals = config.externals || []
    config.externals.push('undici')
    
    return config
  },
  
  // 環境變數配置
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // 圖片優化配置
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
