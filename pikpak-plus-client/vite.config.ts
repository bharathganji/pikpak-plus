import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import svgr from '@svgr/rollup'
import webfontDownload from 'vite-plugin-webfont-dl'
import { VitePWA } from 'vite-plugin-pwa'
import eslintPlugin from '@nabla/vite-plugin-eslint'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules'
import Pages from 'vite-plugin-pages'
import generateSitemap from 'vite-plugin-pages-sitemap'
import Sitemap from 'vite-plugin-sitemap'

dotenv.config() // load env vars from .env
const names = ['create', 'browse', 'login', 'search', 'signup', 'tasks']
const dynamicRoutes = names.map((name) => `/${name}`)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svgr(),
    react(),
    eslintPlugin(),
    ViteImageOptimizer({}),
    Sitemap({
      hostname: 'https://pikpak-plus.com',
      dynamicRoutes,
    }),

    optimizeCssModules(),
    Pages({
      onRoutesGenerated: (routes) => generateSitemap({ routes }),
    }),
    VitePWA({ registerType: 'autoUpdate' }),
    webfontDownload(),
  ],
  define: {
    __VALUE__: `"${process.env.VALUE}"`, // wrapping in "" since it's a string
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/torrent': {
        target: 'https://torrent-api-py-tt6i.onrender.com/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/torrent/, ''),
      },
      '/flaskapi': {
        target: 'http://127.0.0.1:5000/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/flaskapi/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3002,
    proxy: {
      '/torrent': {
        target: 'https://torrent-api-py-tt6i.onrender.com/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/torrent/, ''),
      },
      '/flaskapi': {
        target: 'https://api.pikpak-plus.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/flaskapi/, ''),
      },
    },
  },
  ssr: {
    noExternal: [
      '@ionic/react',
      '@ionic/core',
      'ionicons',
      '@ionic/react-router',
      '@stencil/core',
    ],
  },
})
