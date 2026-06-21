import type { MetadataRoute } from 'next'

// PWA / installable-app manifest. Drives the "Add to Home Screen" / app-wrapper
// experience: app name, description, icon, and theme colors. Next serves this at
// /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NovelCodex — Read web novels',
    short_name: 'NovelCodex',
    description:
      'Read thousands of cultivation, xianxia and wuxia web novels free. Chat with any novel, roleplay with characters, get AI recommendations, and play cultivation games.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#07060d',
    theme_color: '#07060d',
    categories: ['books', 'entertainment', 'education'],
    icons: [
      { src: '/MobileAppIcon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/MobileAppIcon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
    ],
  }
}
