import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'シフト管理アプリ',
    short_name: 'シフト管理',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4B8BF5',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}