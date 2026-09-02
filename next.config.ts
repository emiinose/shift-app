import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack の WebSocket/HMR 接続チェックを緩和
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  // 開発サーバーへの通信を全て許可
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
    ]
  },
}

export default nextConfig
