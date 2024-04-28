import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from '@svgr/rollup'
import webfontDownload from 'vite-plugin-webfont-dl'
import { VitePWA } from 'vite-plugin-pwa'
import eslintPlugin from '@nabla/vite-plugin-eslint'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules'
import Pages from 'vite-plugin-pages'
import generateSitemap from 'vite-plugin-pages-sitemap'
import Sitemap from 'vite-plugin-sitemap'

const names = [
  'create',
  'browse',
  'login',
  'search',
  'signup',
  'tasks',
  'donate',
  'faq',
]
const dynamicRoutes = names.map((name) => `/${name}`)

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return defineConfig({
    plugins: [
      svgr(),
      react(),
      eslintPlugin(),
      ViteImageOptimizer({}),
      Sitemap({
        hostname: env.VITE_HOSTNAME || 'https://pikpak-plus.com',
        dynamicRoutes,
      }),
      optimizeCssModules(),
      Pages({
        onRoutesGenerated: (routes) => generateSitemap({ routes }),
      }),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        workbox: {
          cleanupOutdatedCaches: false,
          sourcemap: true,
        },
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'masked-icon.png',
        ],
        manifest: {
          name: 'PikPak-plus',
          short_name: 'pikpak-plus',
          description:
            'PikPak is a private and safe cloud drive that can save links from Torrent / Magnet / Social Media with 20X faster download and support 4K videos for original quality online playback.',
          theme_color: '#306eff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'masked-icon.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: 'pikpak-plus.png',
              sizes: '640x320',
              type: 'image/png',
            },
            {
              src: 'pikpak-plus.png',
              sizes: '640x320',
              type: 'image/png',
              form_factor: 'wide',
            },
          ],
        },
      }),
      webfontDownload(),
    ],
    server: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_DEVELOPMENT_PORT) || 3001,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000/',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_PRODUCTION_PORT) || 3002,
      proxy: {
        '/api': {
          target: env.VITE_PIKPAK_PLUS_API,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  })
}
