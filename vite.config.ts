import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  // Tôn trọng PORT do môi trường cấp; không có thì về cổng quen thuộc của dự án.
  server: { port: Number(process.env.PORT) || 5180 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Nutrition Tracker',
        short_name: 'Dinh dưỡng',
        description: 'Track dinh dưỡng hàng ngày cho mục tiêu recomp',
        lang: 'vi',
        theme_color: '#0a0c0a',
        background_color: '#0a0c0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
})
